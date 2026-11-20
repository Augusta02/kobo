from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_user
from app.db.pool import get_pool
from app.schemas.rotation import RotationCreate, RotationUpdate, RotationComplete, RotationOut
from app.services import rotation_engine
from app.services.splitting import split_amount

router = APIRouter(tags=["rotations"])


async def _assert_member(conn, household_id, uid):
    member = await conn.fetchrow(
        "select * from members where household_id = $1 and firebase_uid = $2",
        household_id, uid,
    )
    if not member:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not a member of this household")
    return member

async def _assert_household_members(conn, household_id, member_ids) -> None:
    if not member_ids:
        return
    rows = await conn.fetch(
        "select id from members where household_id = $1 and id = any($2::uuid[])",
        household_id, list(member_ids),
    )
    found_ids = {r["id"] for r in rows}
    missing = set(member_ids) - found_ids
    if missing:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "All participants must be members of this household")


async def _fetch_rotation_out(conn, rotation_id):
    rotation = await conn.fetchrow("select * from rotations where id = $1", rotation_id)
    if not rotation:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Rotation not found")

    member_rows = await conn.fetch(
        "select member_id from rotation_members where rotation_id = $1 order by position",
        rotation_id,
    )
    participant_ids = [r["member_id"] for r in member_rows]

    history_rows = await conn.fetch(
        "select id, member_id, amount, completed_at from rotation_history "
        "where rotation_id = $1 order by completed_at desc",
        rotation_id,
    )
    history = []
    for h in history_rows:
        split_rows = await conn.fetch(
            "select member_id, share_amount, paid from rotation_history_splits where history_id = $1",
            h["id"],
        )
        history.append({**dict(h), "splits": [dict(s) for s in split_rows]})

    current_member_id = rotation_engine.current_member(participant_ids, rotation["current_position"])
    due_date = rotation_engine.next_due(rotation["last_completed_at"], rotation["num_days"])

    return {
        "id": rotation["id"],
        "name": rotation["name"],
        "num_days": rotation["num_days"],
        "remind_days": rotation["remind_days"],
        "split_cost": rotation["split_cost"],
        "current_member_id": current_member_id,
        "next_due_date": due_date,
        "is_due": rotation_engine.is_due(due_date),
        "participant_ids": participant_ids,
        "history": history,
    }


@router.post("/households/{household_id}/rotations", response_model=RotationOut, status_code=201)
async def create_rotation(household_id: UUID, payload: RotationCreate, uid: str = Depends(get_current_user)):
    async with get_pool().acquire() as conn, conn.transaction():
        await _assert_member(conn, household_id, uid)
        await _assert_household_members(conn, household_id, payload.participant_ids)

        rotation = await conn.fetchrow(
            "insert into rotations (household_id, name, num_days, remind_days, split_cost) "
            "values ($1, $2, $3, $4, $5) returning id",
            household_id, payload.name, payload.num_days, payload.remind_days, payload.split_cost,
        )
        rotation_id = rotation["id"]

        for position, member_id in enumerate(payload.participant_ids):
            await conn.execute(
                "insert into rotation_members (rotation_id, member_id, position) values ($1, $2, $3)",
                rotation_id, member_id, position,
            )

        return await _fetch_rotation_out(conn, rotation_id)


@router.get("/households/{household_id}/rotations", response_model=list[RotationOut])
async def list_rotations(household_id: UUID, uid: str = Depends(get_current_user)):
    async with get_pool().acquire() as conn:
        await _assert_member(conn, household_id, uid)

        rows = await conn.fetch(
            "select id from rotations where household_id = $1 order by created_at",
            household_id,
        )
        return [await _fetch_rotation_out(conn, r["id"]) for r in rows]


@router.patch("/rotations/{rotation_id}", response_model=RotationOut)
async def update_rotation(rotation_id: UUID, payload: RotationUpdate, uid: str = Depends(get_current_user)):
    async with get_pool().acquire() as conn, conn.transaction():
        rotation = await conn.fetchrow("select * from rotations where id = $1", rotation_id)
        if not rotation:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Rotation not found")

        await _assert_member(conn, rotation["household_id"], uid)
        await _assert_household_members(conn, rotation["household_id"], payload.participant_ids)

        name = payload.name if payload.name is not None else rotation["name"]
        num_days = payload.num_days if payload.num_days is not None else rotation["num_days"]
        remind_days = payload.remind_days if payload.remind_days is not None else rotation["remind_days"]
        split_cost = payload.split_cost if payload.split_cost is not None else rotation["split_cost"]
        await conn.execute(
            "update rotations set name = $1, num_days = $2, remind_days = $3, split_cost = $4 where id = $5",
            name, num_days, remind_days, split_cost, rotation_id,
        )

        if payload.participant_ids is not None:
            await conn.execute("delete from rotation_members where rotation_id = $1", rotation_id)
            for position, member_id in enumerate(payload.participant_ids):
                await conn.execute(
                    "insert into rotation_members (rotation_id, member_id, position) values ($1, $2, $3)",
                    rotation_id, member_id, position,
                )
            if rotation["current_position"] >= len(payload.participant_ids):
                await conn.execute(
                    "update rotations set current_position = 0 where id = $1", rotation_id
                )

        return await _fetch_rotation_out(conn, rotation_id)


@router.delete("/rotations/{rotation_id}", status_code=204)
async def delete_rotation(rotation_id: UUID, uid: str = Depends(get_current_user)):
    async with get_pool().acquire() as conn, conn.transaction():
        rotation = await conn.fetchrow("select * from rotations where id = $1", rotation_id)
        if not rotation:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Rotation not found")

        await _assert_member(conn, rotation["household_id"], uid)

        await conn.execute("delete from rotations where id = $1", rotation_id)


@router.post("/rotations/{rotation_id}/complete", response_model=RotationOut)
async def complete_rotation(rotation_id: UUID, payload: RotationComplete, uid: str = Depends(get_current_user)):
    async with get_pool().acquire() as conn, conn.transaction():
        rotation = await conn.fetchrow("select * from rotations where id = $1", rotation_id)
        if not rotation:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Rotation not found")

        await _assert_member(conn, rotation["household_id"], uid)

        member_rows = await conn.fetch(
            "select member_id from rotation_members where rotation_id = $1 order by position",
            rotation_id,
        )
        participant_ids = [r["member_id"] for r in member_rows]
        current_member_id = rotation_engine.current_member(participant_ids, rotation["current_position"])

        # Whoever actually did it — defaults to whoever's turn it was. If
        # someone else fronted for them, the turn-holder's position doesn't
        # advance, so it's still their turn again next cycle.
        completed_by = payload.completed_by_member_id or current_member_id

        history = await conn.fetchrow(
            "insert into rotation_history (rotation_id, member_id, amount) values ($1, $2, $3) returning id",
            rotation_id, completed_by, payload.amount,
        )

        if rotation["split_cost"] and payload.amount is not None and participant_ids:
            shares = split_amount(payload.amount, [str(pid) for pid in participant_ids], {})
            for member_id, share_amount in shares.items():
                await conn.execute(
                    "insert into rotation_history_splits (history_id, member_id, share_amount, paid) "
                    "values ($1, $2, $3, $4)",
                    history["id"], member_id, share_amount, member_id == str(completed_by),
                )

        # Rebuild the turn order as a queue: whoever just did a turn — whether
        # it was really theirs or they were covering for someone — goes to
        # the back. Whoever's turn was covered for (if different) stays at
        # the front, since they still owe a turn.
        start = rotation["current_position"] % len(participant_ids) if participant_ids else 0
        queue = participant_ids[start:] + participant_ids[:start]
        new_order = [m for m in queue if m != completed_by] + [completed_by]

        await conn.execute("delete from rotation_members where rotation_id = $1", rotation_id)
        for position, member_id in enumerate(new_order):
            await conn.execute(
                "insert into rotation_members (rotation_id, member_id, position) values ($1, $2, $3)",
                rotation_id, member_id, position,
            )

        await conn.execute(
            "update rotations set current_position = 0, last_completed_at = $1 where id = $2",
            date.today(), rotation_id,
        )

        return await _fetch_rotation_out(conn, rotation_id)


@router.patch("/rotations/history/{history_id}/splits/{member_id}/settle", response_model=RotationOut)
async def settle_rotation_split(history_id: UUID, member_id: UUID, uid: str = Depends(get_current_user)):
    async with get_pool().acquire() as conn, conn.transaction():
        history = await conn.fetchrow("select rotation_id from rotation_history where id = $1", history_id)
        if not history:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "History entry not found")

        rotation = await conn.fetchrow("select household_id from rotations where id = $1", history["rotation_id"])
        await _assert_member(conn, rotation["household_id"], uid)

        result = await conn.execute(
            "update rotation_history_splits set paid=true where history_id=$1 and member_id=$2",
            history_id, member_id,
        )
        if result == "UPDATE 0":
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Split not found")

        return await _fetch_rotation_out(conn, history["rotation_id"])