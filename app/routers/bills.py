from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import get_current_user
from app.services.balances import simplify_debts
from app.schemas.bill import BillBalanceOut
from app.db.pool import get_pool
from app.schemas.bill import BillCreate, BillOut, BillUpdate
from app.services.splitting import split_amount
from datetime import date
from app.services import rotation_engine
from decimal import Decimal

router = APIRouter(tags=["bills"])


async def _assert_member(conn, household_id, uid) -> None:
    requester = await conn.fetchrow(
        "SELECT 1 FROM members WHERE household_id=$1 AND firebase_uid=$2",
        household_id, uid,
    )
    if not requester:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not a member of this household")

async def _assert_household_members(conn, household_id, member_ids) -> None:
    if not member_ids:
        return
    rows = await conn.fetch(
        "SELECT id FROM members WHERE household_id=$1 AND id = ANY($2::uuid[])",
        household_id, list(member_ids),
    )
    found_ids = {r["id"] for r in rows}
    missing = set(member_ids) - found_ids
    if missing:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "All participants must be members of this household")


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
        already_contributed = contributions_by_member.get(member_id, Decimal("0.00")) >= share_amount
        await conn.execute(
            "INSERT INTO bill_splits (bill_id, member_id, share_amount, paid) VALUES ($1, $2, $3, $4)",
            bill_id, member_id, share_amount, already_contributed,
        )


async def _update_contributions_only(conn, bill_id, contributions):
    """Record new contributions and recompute paid per member, without touching
    share_amount — used when amount/participants haven't changed, so unaffected
    members' paid status is left exactly as it was."""
    await conn.execute("DELETE FROM bill_contributions WHERE bill_id=$1", bill_id)
    for contribution in contributions:
        await conn.execute(
            "INSERT INTO bill_contributions (bill_id, member_id, amount_contributed) VALUES ($1, $2, $3)",
            bill_id, contribution.member_id, contribution.amount_contributed,
        )

    contributions_by_member = {str(c.member_id): c.amount_contributed for c in contributions}
    splits = await conn.fetch("SELECT member_id, share_amount FROM bill_splits WHERE bill_id=$1", bill_id)
    for split in splits:
        contributed = contributions_by_member.get(str(split["member_id"]), Decimal("0.00"))
        paid = contributed >= split["share_amount"]
        await conn.execute(
            "UPDATE bill_splits SET paid=$1 WHERE bill_id=$2 AND member_id=$3",
            paid, bill_id, split["member_id"],
        )


async def _fetch_bill_out(conn, bill_id) -> dict:
    bill = await conn.fetchrow(
        "SELECT id, name, total_amount, num_days, remind_days, last_settled_at, created_at "
        "FROM bills WHERE id=$1", bill_id
    )
    contributions = await conn.fetch(
        "SELECT member_id, amount_contributed FROM bill_contributions WHERE bill_id=$1", bill_id
    )
    splits = await conn.fetch(
        "SELECT member_id, share_amount, paid FROM bill_splits WHERE bill_id=$1", bill_id
    )

    next_due_date = rotation_engine.next_due(bill["last_settled_at"], bill["num_days"])

    return {
        **dict(bill),
        "next_due_date": next_due_date,
        "is_due": rotation_engine.is_due(next_due_date),
        "contributions": [dict(c) for c in contributions],
        "splits": [dict(s) for s in splits],
    }


@router.post("/households/{household_id}/bills", response_model=BillOut, status_code=status.HTTP_201_CREATED)
async def create_bill(household_id: str, body: BillCreate, uid: str = Depends(get_current_user)):
    async with get_pool().acquire() as conn, conn.transaction():
        await _assert_member(conn, household_id, uid)
        member_ids = set(body.participant_ids) | {c.member_id for c in body.contributions}
        await _assert_household_members(conn, household_id, member_ids)

        bill = await conn.fetchrow(
            "INSERT INTO bills (household_id, name, total_amount, num_days, remind_days) "
            "VALUES ($1, $2, $3, $4, $5) RETURNING id",
            household_id, body.name, body.total_amount, body.num_days, body.remind_days,
        )
        await _write_splits(conn, bill["id"], body.total_amount, body.participant_ids, body.contributions)
        return await _fetch_bill_out(conn, bill["id"])


@router.get("/households/{household_id}/bills", response_model=list[BillOut])
async def list_bills(household_id: str, uid: str = Depends(get_current_user)):
    async with get_pool().acquire() as conn:
        await _assert_member(conn, household_id, uid)
        bills = await conn.fetch("SELECT id FROM bills WHERE household_id=$1", household_id)
        return [await _fetch_bill_out(conn, b["id"]) for b in bills]

@router.get("/households/{household_id}/bill-balances", response_model=list[BillBalanceOut])
async def get_bill_balances(household_id: str, uid: str = Depends(get_current_user)):
    async with get_pool().acquire() as conn:
        await _assert_member(conn, household_id, uid)

        bills = await conn.fetch("SELECT id, name FROM bills WHERE household_id=$1", household_id)

        results = []
        for bill in bills:
            splits = await conn.fetch(
                "SELECT member_id, share_amount, paid FROM bill_splits WHERE bill_id=$1", bill["id"]
            )
            contributions = await conn.fetch(
                "SELECT member_id, amount_contributed FROM bill_contributions WHERE bill_id=$1", bill["id"]
            )
            contributed_by: dict = {}
            for c in contributions:
                contributed_by[c["member_id"]] = (
                    contributed_by.get(c["member_id"], Decimal("0")) + c["amount_contributed"]
                )

            net: dict = {}
            for s in splits:
                contributed = contributed_by.get(s["member_id"], Decimal("0"))
                debt_remaining = Decimal("0") if s["paid"] else max(s["share_amount"] - contributed, Decimal("0"))
                surplus = max(contributed - s["share_amount"], Decimal("0"))
                net[s["member_id"]] = net.get(s["member_id"], Decimal("0")) + surplus - debt_remaining

            for txn in simplify_debts(net):
                results.append({
                    "bill_id": bill["id"],
                    "bill_name": bill["name"],
                    "from_member_id": txn["from_member_id"],
                    "to_member_id": txn["to_member_id"],
                    "amount": txn["amount"],
                })

        return results


@router.patch("/households/{household_id}/bills/{bill_id}", response_model=BillOut)
async def update_bill(household_id: str, bill_id: str, body: BillUpdate, uid: str = Depends(get_current_user)):
    async with get_pool().acquire() as conn, conn.transaction():
        await _assert_member(conn, household_id, uid)

        existing = await conn.fetchrow(
            "SELECT name, total_amount, num_days, remind_days FROM bills WHERE id=$1 AND household_id=$2",
            bill_id, household_id,
        )
        if existing is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Bill not found")
        
        member_ids_to_check = set()
        if body.participant_ids is not None:
            member_ids_to_check |= set(body.participant_ids)
        if body.contributions is not None:
            member_ids_to_check |= {c.member_id for c in body.contributions}
        await _assert_household_members(conn, household_id, member_ids_to_check)

        name = body.name if body.name is not None else existing["name"]
        total_amount = body.total_amount if body.total_amount is not None else existing["total_amount"]
        num_days = body.num_days if body.num_days is not None else existing["num_days"]
        remind_days = body.remind_days if body.remind_days is not None else existing["remind_days"]

        await conn.execute(
            "UPDATE bills SET name=$1, total_amount=$2, num_days=$3, remind_days=$4 WHERE id=$5",
            name, total_amount, num_days, remind_days, bill_id,
        )

        current_splits = await conn.fetch("SELECT member_id FROM bill_splits WHERE bill_id=$1", bill_id)
        current_participant_ids = {str(s["member_id"]) for s in current_splits}

        amount_changed = body.total_amount is not None and body.total_amount != existing["total_amount"]
        participants_changed = (
            body.participant_ids is not None
            and {str(pid) for pid in body.participant_ids} != current_participant_ids
        )

        if amount_changed or participants_changed:
            participant_ids = (
                body.participant_ids if body.participant_ids is not None
                else list(current_participant_ids)
            )

            if body.contributions is not None:
                contributions = body.contributions
            else:
                from app.schemas.bill import ContributionIn
                existing_contributions = await conn.fetch(
                    "SELECT member_id, amount_contributed FROM bill_contributions WHERE bill_id=$1", bill_id
                )
                contributions = [ContributionIn(**dict(c)) for c in existing_contributions]

            # Amount or participants genuinely changed — this is the only case
            # where everyone's paid status legitimately needs recomputing.
            await _write_splits(conn, bill_id, total_amount, participant_ids, contributions)
        elif body.contributions is not None:
            # Just recording a contribution — update paid status for affected
            # members only, leave everyone else untouched.
            await _update_contributions_only(conn, bill_id, body.contributions)

        return await _fetch_bill_out(conn, bill_id)


@router.patch("/households/{household_id}/bills/{bill_id}/splits/{member_id}/settle", response_model=BillOut)
async def settle_bill_split(household_id: str, bill_id: str, member_id: str, uid: str = Depends(get_current_user)):
    async with get_pool().acquire() as conn, conn.transaction():
        await _assert_member(conn, household_id, uid)
        result = await conn.execute(
            "UPDATE bill_splits SET paid=true WHERE bill_id=$1 AND member_id=$2",
            bill_id, member_id,
        )
        if result == "UPDATE 0":
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Split not found")
        return await _fetch_bill_out(conn, bill_id)


@router.patch("/households/{household_id}/bills/{bill_id}/settle-cycle", response_model=BillOut)
async def settle_bill_cycle(household_id: str, bill_id: str, uid: str = Depends(get_current_user)):
    async with get_pool().acquire() as conn, conn.transaction():
        await _assert_member(conn, household_id, uid)
        result = await conn.execute(
            "UPDATE bills SET last_settled_at=$1 WHERE id=$2 AND household_id=$3",
            date.today(), bill_id, household_id,
        )
        if result == "UPDATE 0":
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Bill not found")
        return await _fetch_bill_out(conn, bill_id)


@router.delete("/households/{household_id}/bills/{bill_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bill(household_id: str, bill_id: str, uid: str = Depends(get_current_user)):
    async with get_pool().acquire() as conn, conn.transaction():
        await _assert_member(conn, household_id, uid)
        result = await conn.execute("DELETE FROM bills WHERE id=$1 AND household_id=$2", bill_id, household_id)
        if result == "DELETE 0":
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Bill not found")