from datetime import date
from app.db.pool import get_pool
from app.services import rotation_engine, push


async def _tokens_for_member(conn, member_id):
    rows = await conn.fetch(
        "select token from device_tokens where member_id = $1", member_id
    )
    return [r["token"] for r in rows]


async def _tokens_for_members(conn, member_ids):
    if not member_ids:
        return []
    rows = await conn.fetch(
        "select token from device_tokens where member_id = any($1::uuid[])", member_ids
    )
    return [r["token"] for r in rows]


async def check_rotations(conn):
    rotations = await conn.fetch("select * from rotations")
    for rotation in rotations:
        member_rows = await conn.fetch(
            "select member_id from rotation_members where rotation_id = $1 order by position",
            rotation["id"],
        )
        participant_ids = [r["member_id"] for r in member_rows]
        if not participant_ids:
            continue
        due_date = rotation_engine.next_due(rotation["last_completed_at"], rotation["num_days"])
        days_away = (due_date - date.today()).days
        if days_away not in (0, 2):
            continue
        current_member_id = rotation_engine.current_member(participant_ids, rotation["current_position"])
        tokens = await _tokens_for_member(conn, current_member_id)
        when = "today" if days_away == 0 else "in 2 days"
        await push.send_push_notification(tokens, rotation["name"], f"It's your turn for {rotation['name']}, due {when}.")


async def check_bills(conn):
    bills = await conn.fetch("select * from bills")
    for bill in bills:
        due_date = rotation_engine.next_due(bill["last_settled_at"], bill["num_days"])
        days_away = (due_date - date.today()).days
        if days_away not in (0, 2):
            continue
        split_rows = await conn.fetch(
            "select member_id from bill_splits where bill_id = $1", bill["id"]
        )
        participant_ids = [r["member_id"] for r in split_rows]
        tokens = await _tokens_for_members(conn, participant_ids)
        when = "today" if days_away == 0 else "in 2 days"
        await push.send_push_notification(tokens, bill["name"], f"{bill['name']} is due {when}.")


async def run_reminders():
    async with get_pool().acquire() as conn:
        await check_rotations(conn)
        await check_bills(conn)