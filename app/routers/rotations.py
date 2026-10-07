from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_user
from app.db.pool import get_pool
from app.schemas.rotation import RotationCreate, RotationComplete, RotationOut
from app.services import rotation_engine

router = APIRouter(tags=["rotations"])


async def _assert_member(conn, household_id, uid):
    member = await conn.fetchrow(
        "select * from members where household_id = $1 and firebase_uid = $2",
        household_id, uid,
    )
    if not member:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not a member of this household")
    return member


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
        "select member_id, amount, completed_at from rotation_history "
        "where rotation_id = $1 order by completed_at desc",
        rotation_id,
    )

    current_member_id = rotation_engine.current_member(participant_ids, rotation["current_position"])
    due_date = rotation_engine.next_due(rotation["last_completed_at"], rotation["num_days"])

    return {
        "id": rotation["id"],
        "name": rotation["name"],
        "num_days": rotation["num_days"],
        "current_member_id": current_member_id,
        "next_due_date": due_date,
        "is_due": rotation_engine.is_due(due_date),
        "participant_ids": participant_ids,
        "history": [dict(r) for r in history_rows],
    }


@router.post("/households/{household_id}/rotations", response_model=RotationOut, status_code=201)
async def create_rotation(household_id: UUID, payload: RotationCreate, uid: str = Depends(get_current_user)):
    async with get_pool().acquire() as conn, conn.transaction():
        await _assert_member(conn, household_id, uid)

        rotation = await conn.fetchrow(
            "insert into rotations (household_id, name, num_days) values ($1, $2, $3) returning id",
            household_id, payload.name, payload.num_days,
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

        await conn.execute(
            "insert into rotation_history (rotation_id, member_id, amount) values ($1, $2, $3)",
            rotation_id, current_member_id, payload.amount,
        )

        new_position = rotation_engine.advance(rotation["current_position"], len(participant_ids))
        await conn.execute(
            "update rotations set current_position = $1, last_completed_at = $2 where id = $3",
            new_position, date.today(), rotation_id,
        )

        return await _fetch_rotation_out(conn, rotation_id)