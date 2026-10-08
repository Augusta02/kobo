# Kobo Backend â€” Build Log

## Stack
- FastAPI, Python 3.12, managed with uv
- PostgreSQL, queried directly with asyncpg, no ORM
- Firebase Authentication for sign-in, verified server-side with firebase-admin
- Plain numbered .sql files in app/db/migrations, applied by scripts/migrate.py
- Windows + PowerShell as the local dev environment

## Status
- Phase 0, project skeleton: done
- Phase 1, auth and households: done, tested end to end
- Phase 2, bills and the split function: starting next

## Phase 0 â€” Project Skeleton
- FastAPI app with a single /health route
- asyncpg connection pool wired into FastAPI's lifespan
- scripts/migrate.py, applies pending .sql files in order and records each in a schema_migrations table
- 0001_init.sql: households and members tables
- Deployed nothing yet, Railway/Render still pending

## Phase 1 â€” Auth and Households
- Firebase project created, email/password sign-in enabled
- firebase-admin verifies ID tokens server-side via get_current_user in app/core/security.py
- 0002_add_invites.sql: invites table
- app/routers/households.py:
  - POST /households, creates a household and makes the creator its admin
  - POST /households/{id}/invite, admin-only, generates a 24-hour invite code
  - POST /invites/{code}/accept, joins the caller to the household as a non-admin member
  - GET /households/{id}/members, lists members, restricted to existing members
- Tested end to end with two real Firebase test users: household created, invite generated, second user accepted it, both show up in the member list

Not yet enforced, carried into Phase 2 or a later cleanup pass:
- cap a household at 5 members
- explicit check that a household never ends up with more than one admin, currently true only because accept_invite never sets is_admin, not because anything actively prevents it

## Errors hit and how each was resolved

Environment and tooling
- `python scripts/migrate.py` failed with `ModuleNotFoundError: No module named 'app'`. Running a file directly only puts its own folder on the path. Fixed by adding scripts/__init__.py and running it as a module instead, `uv run python -m scripts.migrate`.
- `uvicorn --reload` failed with `TypeError: unsupported operand type(s) for |: 'type' and 'NoneType'`. The venv had been created against an old Python from Anaconda rather than a modern one, and `asyncpg.Pool | None` needs Python 3.10+. Fixed by recreating the venv with `uv venv --python 3.12`.
- `psql` not recognized in PowerShell. Its install folder wasn't on PATH. Fixed temporarily with `$env:Path += "...\PostgreSQL\18\bin"`, then permanently with `[Environment]::SetEnvironmentVariable(...)`.
- psql asking for a password on every call. Expected behavior, not a bug. `$env:PGPASSWORD` can suppress it for a single terminal session if wanted.
- Considered switching to Docker for Postgres. Decided against it for now, native Postgres was already working and Docker would add complexity without a corresponding benefit at this stage.
- A real Gmail password was pasted into a terminal command shown in chat. Not a code bug, but noted here as a reminder: always test against a disposable account, never a real one.

Git and GitHub
- `git push` failed with `src refspec main does not match any`. There were no commits yet, `git commit` had been skipped. Fixed by running `git add .` then `git commit` before pushing.
- Needed pushes to go to a personal GitHub account regardless of whatever account is active globally. Solved with a dedicated SSH key and a `github-personal` Host alias in `~/.ssh/config`, so the remote URL itself determines the identity, independent of global git config or cached credentials.

Database and migrations
- `asyncpg.connect` failed outright. The .env file still had the placeholder `user:password@localhost:5432/kobo`. Fixed by installing Postgres locally and swapping in real credentials.
- `UndefinedTableError: relation "households" does not exist`, even though migrations appeared to have run. Root cause took several passes to isolate:
  - `scripts/migrate.py` pointed `MIGRATIONS_DIR` at the wrong folder at two different points, first missing one `.parent`, pointing at `scripts/app/db/migrations` which doesn't exist, later missing a second `.parent`, pointing at `scripts/migrations`. An empty glob result fails silently, no files found just means the apply loop never runs, no error raised.
  - A typo in the applied-files lookup, `r['filename ']` with a trailing space, would have caused a KeyError, but only once a row existed, so it stayed hidden until the path bug was fixed first.
  - 0001_init.sql had three separate typos: `create extensions` instead of singular `extension`, `pycrypto` instead of `pgcrypto`, and `household_id_uuid` instead of two separate tokens, `household_id uuid`. 0002_add_invites.sql repeated that same `household_id_uuid` typo.
  - Fixed by rewriting both migration files cleanly and correcting the script's path logic, confirmed by watching migrate.py actually print "Applying ..." for each file and then checking `\dt` in psql.

Application code
- `NameError: name 'household_id' is not defined`, in create_household. A line referenced an undefined `household_id` instead of `household["id"]`, the actual variable holding the inserted row. Fixed by correcting the reference.
- `ResponseValidationError` on POST /households, pydantic couldn't read fields off an asyncpg.Record directly. Fixed by wrapping single-row returns in `dict(...)` before returning them.
- Same error on GET /households/{id}/members, for two reasons at once: the SQL's SELECT was missing the `id` column entirely even though the response schema required it, and the list of rows wasn't converted to dicts the way the single-row endpoints were. Fixed by adding `id` to the SELECT and returning `[dict(m) for m in members]`.
- Same error again on a second pass over that same endpoint, after household_id was added to the MemberOut schema without updating the query to select it, and because MemberOut's `id` field was typed as plain `str` while asyncpg returns a real `UUID` object for a uuid column. Fixed by changing the schema's `id` field to type `UUID` and adding `household_id` back into the SELECT.
- `UniqueViolationError` on `members_firebase_uid_key` when re-testing create_household with a token that had already been used once. Not a bug, the constraint was doing exactly what it should, one Firebase account can only ever belong to one household. The earlier "successful" attempt had actually already inserted the row, the error at the time came from response serialization after the transaction had committed, not from the insert itself.
## Phase 2 — Bills, completed
- bills and bill_splits tables, later reworked from a single payer_id to a contributions model: anyone can have already put money toward a bill, split still happens equally across every participant
- create, list, patch, delete, all tested with three real members
- a partial unique index enforces exactly one admin per household at the database level, plus a transfer-admin route for handing it to someone else
- decided against a member cap, a household can hold as many people as it needs


## Phase 3 — Expenses and receipts, completed
- AWS S3 for storing receipt photos, AWS Textract's AnalyzeExpense for reading totals off them, chosen over a per-call vision LLM for cost
- app/services/receipts.py, uploads a photo and returns its parsed total, tested standalone against a real receipt before any route touched it
- expenses, expense_contributions, expense_splits, same shape as bills
- scan-receipt is a separate step from create_expense on purpose, extraction first, person confirms or corrects the total, then it gets saved, matching the original spec
- settle routes added for both bills and expenses, a split can be marked paid manually
- a split now also gets marked paid automatically at creation time, if someone's contribution already covers their own share, they were never owing anything to begin with, forcing a manual settle on that case made no sense


- Editing a migration file after Postgres already recorded it as applied doesn't make the new version run. Hit this twice, once when total_amount and share_amount were meant to become numeric(12,2) but the actual column stayed integer, and once with the filename-numbering cleanup. Fix is always the same: drop the affected tables, delete the matching row from schema_migrations, then rerun.
- .env values wrapped in quotes, 'like-this', get written into the file literally, quote marks included, though python-dotenv itself tolerates and strips them. Worth keeping values unquoted regardless.
- Textract calls failed with SubscriptionRequiredException on a brand-new AWS account, even though S3 worked fine with the same keys. Cause was AWS's Free Plan, active for all accounts created after mid-2025, which blocks a specific list of services including Textract outright, not a delay. Fixed by upgrading to the Paid plan, existing credits carried over.
- return await _fetch_expense_out(conn, expense_id) sat one indent level outside its async with conn block in create_expense, so the connection had already been released back to the pool by the time it ran. Same class of bug as the earlier list_bills return-inside-the-loop issue, watch indentation around early returns inside a transaction block.


## Phase 4: Rotations - complete
- Built rotation_engine.py (current_member, advance, next_due, is_due) with no type hints on internal functions, per preference
- Tested rotation_engine standalone before touching the database
- Migration add_rotations.sql applied (rotations, rotation_members, rotation_history)
- Renamed interval_days to num_days in schema/router, then ALTER TABLE'd the already-applied column to match (no drop/rerun needed since no rotation data existed yet)
- Built schemas/rotation.py and routers/rotations.py: create_rotation, list_rotations, complete_rotation - single payer always, no splits
- Fixed rotations router showing under 'default' in Swagger - missing tags=['rotations'] on APIRouter
- Tested end-to-end via Swagger: create_rotation correctly set is_due=true with no prior history, complete_rotation correctly advanced position, logged history, and recomputed next_due_date

## Phase 5: Goals - complete
- Reused split_amount from splitting.py for goals: equal share per participant at creation, remainder to first listed participant
- goal_contributions logs open-ended contributions over time against a fixed share, unlike bills/expenses which settle once
- Built schemas/goal.py and routers/goals.py: create_goal, list_goals, add_contribution, update_goal, delete_goal
- update_goal recomputes each participant's share_amount when target_amount changes, using real contribution totals so far to decide who absorbs the rounding remainder - contributions themselves are untouched
- delete_goal relies on ON DELETE CASCADE from goal_participants and goal_contributions, no manual cleanup needed
- Tested end-to-end via Swagger: create with 3 participants, add a contribution, rename and retarget the goal, confirmed remainder correctly followed the real contributor

## Phase 6 (in progress): device registration built
- Added device_tokens table (member_id, token, unique on token)
- Built schemas/device.py and routers/devices.py: register_device and unregister_device
- register_device enforces a member can only register tokens against their own member_id
- ON CONFLICT (token) DO UPDATE handles token reuse on reinstall without erroring
- Not yet tested with a real FCM token - no mobile client exists yet to generate one
- Next: the reminders job itself (apscheduler, checks rotations/bills due in 2 days or today, sends via FCM to registered tokens)

## Phase 6: Notifications - complete
- Added device_tokens table and registration/unregistration routes, scoped so a member can only register tokens against their own member_id
- Built push.py wrapping firebase-admin's FCM messaging, run via asyncio.to_thread since the SDK call is synchronous
- Built reminders.py: checks every rotation and bill, computes days until due via rotation_engine, notifies the current member for rotations and all participants for bills, only at exactly 2 days out or due today
- Wired apscheduler to run the check daily at 8am via scheduler.py, started/stopped in main.py's lifespan
- Added a manual trigger route (POST /jobs/reminders/run) since waiting for real due dates isn't practical for testing
- Fixed several bugs during testing: missing date import, a memer_ids typo, check_rotations missing its conn parameter, notifiication/Notificiation typos in the FCM message construction
- Tested end-to-end: forced a bill to be due today via direct SQL, triggered the job manually, confirmed the terminal printed the correct notification text with an empty token list (no real device registered yet)
- Real push delivery to a phone remains untested until Phase 7 provides an actual mobile client to generate a device token
