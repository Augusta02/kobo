from datetime import datetime
from pydantic import BaseModel
from uuid import UUID
from decimal import Decimal

class ContributionIn(BaseModel):
    member_id: UUID
    amount_contributed: Decimal

class ExpenseCreate(BaseModel):
    name: str
    category: str
    total_amount: Decimal
    participant_ids: list[UUID]
    contributions: list[ContributionIn] = []
    s3_key: str | None = None  # Optional S3 key for the receipt image

class ContributionOut(BaseModel):
    member_id: UUID
    amount_contributed: Decimal

class ExpenseSplitOut(BaseModel):
    member_id: UUID
    share_amount: Decimal
    paid: bool

class ExpenseOut(BaseModel):
    id: UUID
    name: str
    category: str
    total_amount: Decimal
    created_at: datetime
    contributions: list[ContributionOut]
    splits: list[ExpenseSplitOut]
    s3_key: str | None = None  # Optional S3 key for the receipt image