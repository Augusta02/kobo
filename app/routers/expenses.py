from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from app.core.security import get_current_user
from app.db.pool import get_pool
from app.schemas.expense import ExpenseCreate, ExpenseOut
from app.services.receipts import process_receipt
from app.services.splitting import split_amount

router = APIRouter(tags=["expenses"])

async def _assert_member(conn, household_id, uid) -> None:
    requester = await conn.fetchrow(
        "SELECT 1 FROM members WHERE household_id=$1 AND firebase_uid=$2",
        household_id, uid,
    )
    if not requester:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not a member of this household")

async def _fetch_expense_out(conn, expense_id) -> dict:
    expense = await conn.fetchrow(
        "SELECT id, name, category, total_amount, s3_key, created_at FROM expenses WHERE id=$1", expense_id
    )
    contributions = await conn.fetch(
        "SELECT member_id, amount_contributed FROM expense_contributions WHERE expense_id=$1", expense_id
    )
    splits = await conn.fetch(
        "SELECT member_id, share_amount, paid FROM expense_splits WHERE expense_id=$1", expense_id
    )
    return {
        **dict(expense),
        "contributions": [dict(c) for c in contributions],
        "splits": [dict(s) for s in splits],
    }

@router.post("/households/{household_id}/expenses/scan-receipt")
async def scan_receipt(household_id: str, file: UploadFile = File(...), uid: str = Depends(get_current_user)):
    images_bytes = await file.read()
    result = process_receipt(images_bytes, filename_hint=file.filename.split(".")[-1])
    return {'total': result['total'], "s3_key": result['s3_key']}

@router.post("/households/{household_id}/expenses", response_model=ExpenseOut, status_code=status.HTTP_201_CREATED)
async def create_expense(household_id: str, body: ExpenseCreate, uid: str = Depends(get_current_user)):
    async with get_pool().acquire() as conn, conn.transaction():
        await _assert_member(conn, household_id, uid)

        expense = await conn.fetchrow(
            "INSERT INTO expenses (household_id, name, category, total_amount, s3_key)"
            "VALUES ($1, $2, $3, $4, $5) RETURNING id",
            household_id, body.name, body.category, body.total_amount, body.s3_key
        )

        expense_id = expense["id"]
        for contribution in body.contributions:
            await conn.execute(
                "INSERT INTO expense_contributions (expense_id, member_id, amount_contributed) VALUES ($1, $2, $3)",
                expense_id, contribution.member_id, contribution.amount_contributed
            )
        contributions_by_member = {str(c.member_id): c.amount_contributed for c in body.contributions}

        shares = split_amount(
            body.total_amount, [str(pid) for pid in body.participant_ids], contributions_by_member
            )
        for member_id, share_amount in shares.items():
            await conn.execute(
                "INSERT INTO expense_splits (expense_id, member_id, share_amount) VALUES ($1, $2, $3)",
                expense_id, member_id, share_amount
            )

        return await _fetch_expense_out(conn, expense_id)

@router.get("/households/{household_id}/expenses", response_model=list[ExpenseOut])
async def list_expenses(household_id: str, uid: str = Depends(get_current_user)):
    async with get_pool().acquire() as conn:
        await _assert_member(conn, household_id, uid)
        expenses = await conn.fetch(
            "SELECT id FROM expenses WHERE household_id=$1 ORDER BY created_at DESC", household_id
        )
        return [await _fetch_expense_out(conn, expense["id"]) for expense in expenses]