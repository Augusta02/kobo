from datetime import datetime
from uuid import UUID
from pydantic import BaseModel
from decimal import Decimal

class BillCreate(BaseModel):
    name: str
    total_amount: Decimal
    num_days: int
    payer_id: UUID
    participant_ids: list[UUID]

class BillSplitOut(BaseModel):
    member_id: UUID
    share_amount: Decimal
    paid: bool

class BillOut(BaseModel):
    id: UUID
    name: str
    total_amount: Decimal
    num_days: int
    payer_id: UUID
    created_at: datetime
    splits: list[BillSplitOut]

class BillUpdate(BaseModel):
    name: str | None = None
    total_amount: Decimal | None = None
    num_days: int | None = None
    payer_id: UUID | None = None
    participant_ids: list[UUID] | None = None