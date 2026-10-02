# Kobo Backend — Build Log

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

## Phase 0 — Project Skeleton
- FastAPI app with a single /health route
- asyncpg connection pool wired into FastAPI's lifespan
- scripts/migrate.py, applies pending .sql files in order and records each in a schema_migrations table
- 0001_init.sql: households and members tables
- Deployed nothing yet, Railway/Render still pending

## Phase 1 — Auth and Households
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