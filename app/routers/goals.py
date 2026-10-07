from decimal import Decimal
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import get_current_user
from app.db.pool import get_pool
from app.schemas.goal import GoalCreate, GoalUpdate, ContributionCreate, GoalOut
from app.services.splitting import split_amount

router = APIRouter(tags=["goals"])


async def _assert_member(conn, household_id, uid):
    member = await conn.fetchrow(
        "select * from members where household_id = $1 and firebase_uid = $2",
        household_id, uid,
    )
    if not member:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not a member of this household")
    return member


async def _fetch_goal_out(conn, goal_id):
    goal = await conn.fetchrow("select * from goals where id = $1", goal_id)
    if not goal:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Goal not found")

    participant_rows = await conn.fetch(
        "select member_id, share_amount from goal_participants where goal_id = $1",
        goal_id,
    )
    contribution_rows = await conn.fetch(
        "select member_id, amount, contributed_at from goal_contributions "
        "where goal_id = $1 order by contributed_at",
        goal_id,
    )

    contributed_by_member = {}
    for row in contribution_rows:
        contributed_by_member[row["member_id"]] = (
            contributed_by_member.get(row["member_id"], Decimal("0")) + row["amount"]
        )

    participants = []
    for row in participant_rows:
        contributed = contributed_by_member.get(row["member_id"], Decimal("0"))
        participants.append({
            "member_id": row["member_id"],
            "share_amount": row["share_amount"],
            "contributed_so_far": contributed,
            "remaining": row["share_amount"] - contributed,
            "is_complete": contributed >= row["share_amount"],
        })

    total_saved = sum(contributed_by_member.values(), Decimal("0"))

    return {
        "id": goal["id"],
        "name": goal["name"],
        "target_amount": goal["target_amount"],
        "total_saved": total_saved,
        "is_complete": total_saved >= goal["target_amount"],
        "participants": participants,
        "contributions": [dict(r) for r in contribution_rows],
    }


@router.post("/households/{household_id}/goals", response_model=GoalOut, status_code=201)
async def create_goal(household_id: UUID, payload: GoalCreate, uid: str = Depends(get_current_user)):
    async with get_pool().acquire() as conn, conn.transaction():
        await _assert_member(conn, household_id, uid)

        shares = split_amount(payload.target_amount, payload.participant_ids, {})

        goal = await conn.fetchrow(
            "insert into goals (household_id, name, target_amount) values ($1, $2, $3) returning id",
            household_id, payload.name, payload.target_amount,
        )
        goal_id = goal["id"]

        for member_id, share_amount in shares.items():
            await conn.execute(
                "insert into goal_participants (goal_id, member_id, share_amount) values ($1, $2, $3)",
                goal_id, member_id, share_amount,
            )

        return await _fetch_goal_out(conn, goal_id)


@router.get("/households/{household_id}/goals", response_model=list[GoalOut])
async def list_goals(household_id: UUID, uid: str = Depends(get_current_user)):
    async with get_pool().acquire() as conn:
        await _assert_member(conn, household_id, uid)

        rows = await conn.fetch(
            "select id from goals where household_id = $1 order by created_at",
            household_id,
        )
        return [await _fetch_goal_out(conn, r["id"]) for r in rows]


@router.post("/goals/{goal_id}/contributions", response_model=GoalOut, status_code=201)
async def add_contribution(goal_id: UUID, payload: ContributionCreate, uid: str = Depends(get_current_user)):
    async with get_pool().acquire() as conn, conn.transaction():
        goal = await conn.fetchrow("select * from goals where id = $1", goal_id)
        if not goal:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Goal not found")

        await _assert_member(conn, goal["household_id"], uid)

        participant = await conn.fetchrow(
            "select 1 from goal_participants where goal_id = $1 and member_id = $2",
            goal_id, payload.member_id,
        )
        if not participant:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Member is not a participant in this goal")

        await conn.execute(
            "insert into goal_contributions (goal_id, member_id, amount) values ($1, $2, $3)",
            goal_id, payload.member_id, payload.amount,
        )

        return await _fetch_goal_out(conn, goal_id)

@router.patch("/goals/{goal_id}", response_model=GoalOut)
async def update_goal(goal_id: UUID, payload: GoalUpdate, uid: str = Depends(get_current_user)):
    async with get_pool().acquire() as conn, conn.transaction():
        goal = await conn.fetchrow("select * from goals where id = $1", goal_id)
        if not goal:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Goal not found")

        await _assert_member(conn, goal["household_id"], uid)

        if payload.name is not None:
            await conn.execute("update goals set name = $1 where id = $2", payload.name, goal_id)

        if payload.target_amount is not None:
            participant_rows = await conn.fetch(
                "select member_id from goal_participants where goal_id = $1", goal_id
            )
            participant_ids = [r["member_id"] for r in participant_rows]

            contribution_rows = await conn.fetch(
                "select member_id, amount from goal_contributions where goal_id = $1", goal_id
            )
            contributed_by_member = {}
            for row in contribution_rows:
                contributed_by_member[row["member_id"]] = (
                    contributed_by_member.get(row["member_id"], Decimal("0")) + row["amount"]
                )

            shares = split_amount(payload.target_amount, participant_ids, contributed_by_member)

            for member_id, share_amount in shares.items():
                await conn.execute(
                    "update goal_participants set share_amount = $1 where goal_id = $2 and member_id = $3",
                    share_amount, goal_id, member_id,
                )

            await conn.execute(
                "update goals set target_amount = $1 where id = $2", payload.target_amount, goal_id
            )

        return await _fetch_goal_out(conn, goal_id)


@router.delete("/goals/{goal_id}", status_code=204)
async def delete_goal(goal_id: UUID, uid: str = Depends(get_current_user)):
    async with get_pool().acquire() as conn, conn.transaction():
        goal = await conn.fetchrow("select * from goals where id = $1", goal_id)
        if not goal:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Goal not found")

        await _assert_member(conn, goal["household_id"], uid)

        await conn.execute("delete from goals where id = $1", goal_id)