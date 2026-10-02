from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import get_current_user
from app.db.pool import get_pool
from app.schemas.bill import BillCreate, BillOut, BillUpdate
from app.services.splitting import split_amount

router = APIRouter(tags=['bills'])

async def _assert_member(conn, household_id, uid):
    requester = await conn.fetchrow(
        "SELECT 1 FROM members WHERE household_id=$1 AND firebase_uid=$2", 
        household_id, uid
    )
    if not requester:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of the household")

@router.post("/households/{household_id}/bills", response_model=BillOut, status_code=status.HTTP_201_CREATED)
async def create_bill(household_id: str, body: BillCreate, uid: str = Depends(get_current_user)):
    async with get_pool().acquire() as conn, conn.transaction():
        await _assert_member(conn, household_id, uid)
        
        bill = await conn.fetchrow(
            "INSERT INTO bills (household_id, name, total_amount, num_days, payer_id) "
            "VALUES ($1, $2, $3, $4, $5) RETURNING id, name, total_amount, num_days, payer_id, created_at",
            household_id, body.name, body.total_amount, body.num_days, body.payer_id
        )

        participant_ids = [str(pid) for pid in body.participant_ids]
        shares = split_amount(body.total_amount, participant_ids, str(body.payer_id))
        splits = []
        for member_id, share_amount in shares.items():
            split = await conn.fetchrow(
                "INSERT INTO bill_splits (bill_id, member_id, share_amount) VALUES ($1, $2, $3)"
                "RETURNING member_id, share_amount, paid",
                bill["id"], member_id, share_amount
            )
            splits.append(dict(split))
        
    return {**dict(bill), "splits": splits}

@router.get("/households/{household_id}/bills", response_model=list[BillOut])
async def list_bills(household_id: str, uid: str = Depends(get_current_user)):
    async with get_pool().acquire() as conn:
        await _assert_member(conn, household_id, uid)
        bills = await conn.fetch(
            "SELECT * FROM bills WHERE household_id=$1",
            household_id,
        )
        result= []
        for bill in bills:
            splits = await conn.fetch(
                "SELECT member_id, share_amount, paid FROM bill_splits WHERE bill_id=$1",
                bill["id"]
            )
            result.append({**dict(bill), "splits": [dict(split) for split in splits]})
        return result

@router .patch("/households/{household_id}/bills/{bill_id}", response_model=BillOut)
async def update_bill(household_id: str, bill_id: str, body: BillUpdate, uid: str = Depends(get_current_user)):
    async with get_pool().acquire() as conn, conn.transaction():
        await _assert_member(conn, household_id, uid)
        
        existing = await conn.fetchrow(
            "SELECT * FROM bills WHERE id=$1 AND household_id=$2",
            bill_id, household_id
        )
        if existing is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bill not found")
        
        name = body.name if body.name is not None else existing["name"]
        total_amount = body.total_amount if body.total_amount is not None else existing["total_amount"]
        num_days = body.num_days if body.num_days is not None else existing["num_days"]
        payer_id = body.payer_id if body.payer_id is not None else existing["payer_id"]
        
        updated_bill = await conn.fetchrow(
            "UPDATE bills SET name=$1, total_amount=$2, num_days=$3, payer_id=$4 WHERE id=$5 AND household_id=$6 "
            "RETURNING id, name, total_amount, num_days, payer_id, created_at",
            name, total_amount, num_days, payer_id, bill_id, household_id
        )
        splits_changed = any(v is not None for v in (body.total_amount, body.payer_id, body.participant_ids))
        if splits_changed:
            # Re-calculate splits based on updated values
            if body.participant_ids is not None:
                participant_ids = [str(pid) for pid in body.participant_ids]
            else:
                current_splits = await conn.fetch(
                    "SELECT member_id FROM bill_splits WHERE bill_id=$1",
                    bill_id
                )
                participant_ids = [str(split["member_id"]) for split in current_splits]

            shares = split_amount(total_amount, participant_ids, str(payer_id))
            # Update existing splits or insert new ones
            await conn.execute(
                "DELETE FROM bill_splits WHERE bill_id=$1",
                bill_id
            )
            splits = []
            for member_id, share_amount in shares.items():
                split = await conn.fetchrow(
                    "INSERT INTO bill_splits (bill_id, member_id, share_amount) VALUES ($1, $2, $3)"
                    "RETURNING member_id, share_amount, paid",
                    bill_id, member_id, share_amount
                )
                splits.append(dict(split))
        else:
            existing_splits = await conn.fetch(
                "SELECT member_id, share_amount, paid FROM bill_splits WHERE bill_id=$1",
                bill_id
            )
            splits = [dict(split) for split in existing_splits]
    return {**dict(updated_bill), "splits": splits}



@router .delete("/households/{household_id}/bills/{bill_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bill(household_id: str, bill_id: str, uid: str = Depends(get_current_user)):
    async with get_pool().acquire() as conn, conn.transaction():
        await _assert_member(conn, household_id, uid)
        result = await conn.execute(
            "DELETE FROM bills WHERE id=$1 AND household_id=$2",
            bill_id, household_id
        )
        if result == "DELETE 0":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bill not found")