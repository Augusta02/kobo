from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_user
from app.db.pool import get_pool
from app.schemas.bill import BillCreate, BillOut, BillUpdate
from app.services.splitting import split_amount

router = APIRouter(tags=["bills"])


async def _assert_member(conn, household_id, uid) -> None:
    requester = await conn.fetchrow(
        "SELECT 1 FROM members WHERE household_id=$1 AND firebase_uid=$2",
        household_id, uid,
    )
    if not requester:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not a member of this household")


async def _write_splits(conn, bill_id, total_amount, participant_ids, contributions):
    contributions_by_member = {str(c.member_id): c.amount_contributed for c in contributions}

    await conn.execute("DELETE FROM bill_splits WHERE bill_id=$1", bill_id)
    await conn.execute("DELETE FROM bill_contributions WHERE bill_id=$1", bill_id)

    for contribution in contributions:
        await conn.execute(
            "INSERT INTO bill_contributions (bill_id, member_id, amount_contributed) VALUES ($1, $2, $3)",
            bill_id, contribution.member_id, contribution.amount_contributed,
        )

    shares = split_amount(total_amount, [str(pid) for pid in participant_ids], contributions_by_member)
    for member_id, share_amount in shares.items():
        await conn.execute(
            "INSERT INTO bill_splits (bill_id, member_id, share_amount) VALUES ($1, $2, $3)",
            bill_id, member_id, share_amount,
        )


async def _fetch_bill_out(conn, bill_id) -> dict:
    bill = await conn.fetchrow(
        "SELECT id, name, total_amount, num_days, created_at FROM bills WHERE id=$1", bill_id
    )
    contributions = await conn.fetch(
        "SELECT member_id, amount_contributed FROM bill_contributions WHERE bill_id=$1", bill_id
    )
    splits = await conn.fetch(
        "SELECT member_id, share_amount, paid FROM bill_splits WHERE bill_id=$1", bill_id
    )
    return {
        **dict(bill),
        "contributions": [dict(c) for c in contributions],
        "splits": [dict(s) for s in splits],
    }


@router.post("/households/{household_id}/bills", response_model=BillOut, status_code=status.HTTP_201_CREATED)
async def create_bill(household_id: str, body: BillCreate, uid: str = Depends(get_current_user)):
    async with get_pool().acquire() as conn, conn.transaction():
        await _assert_member(conn, household_id, uid)

        bill = await conn.fetchrow(
            "INSERT INTO bills (household_id, name, total_amount, num_days) VALUES ($1, $2, $3, $4) "
            "RETURNING id",
            household_id, body.name, body.total_amount, body.num_days,
        )
        await _write_splits(conn, bill["id"], body.total_amount, body.participant_ids, body.contributions)
        return await _fetch_bill_out(conn, bill["id"])


@router.get("/households/{household_id}/bills", response_model=list[BillOut])
async def list_bills(household_id: str, uid: str = Depends(get_current_user)):
    async with get_pool().acquire() as conn:
        await _assert_member(conn, household_id, uid)
        bills = await conn.fetch("SELECT id FROM bills WHERE household_id=$1", household_id)
        return [await _fetch_bill_out(conn, b["id"]) for b in bills]


@router.patch("/households/{household_id}/bills/{bill_id}", response_model=BillOut)
async def update_bill(household_id: str, bill_id: str, body: BillUpdate, uid: str = Depends(get_current_user)):
    async with get_pool().acquire() as conn, conn.transaction():
        await _assert_member(conn, household_id, uid)

        existing = await conn.fetchrow(
            "SELECT name, total_amount, num_days FROM bills WHERE id=$1 AND household_id=$2",
            bill_id, household_id,
        )
        if existing is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Bill not found")

        name = body.name if body.name is not None else existing["name"]
        total_amount = body.total_amount if body.total_amount is not None else existing["total_amount"]
        num_days = body.num_days if body.num_days is not None else existing["num_days"]

        await conn.execute(
            "UPDATE bills SET name=$1, total_amount=$2, num_days=$3 WHERE id=$4",
            name, total_amount, num_days, bill_id,
        )

        needs_resplit = any(v is not None for v in (body.total_amount, body.participant_ids, body.contributions))
        if needs_resplit:
            if body.participant_ids is not None:
                participant_ids = body.participant_ids
            else:
                current_splits = await conn.fetch("SELECT member_id FROM bill_splits WHERE bill_id=$1", bill_id)
                participant_ids = [s["member_id"] for s in current_splits]

            if body.contributions is not None:
                contributions = body.contributions
            else:
                from app.schemas.bill import ContributionIn
                existing_contributions = await conn.fetch(
                    "SELECT member_id, amount_contributed FROM bill_contributions WHERE bill_id=$1", bill_id
                )
                contributions = [ContributionIn(**dict(c)) for c in existing_contributions]

            await _write_splits(conn, bill_id, total_amount, participant_ids, contributions)

        return await _fetch_bill_out(conn, bill_id)


@router.delete("/households/{household_id}/bills/{bill_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bill(household_id: str, bill_id: str, uid: str = Depends(get_current_user)):
    async with get_pool().acquire() as conn, conn.transaction():
        await _assert_member(conn, household_id, uid)
        result = await conn.execute("DELETE FROM bills WHERE id=$1 AND household_id=$2", bill_id, household_id)
        if result == "DELETE 0":
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Bill not found")
