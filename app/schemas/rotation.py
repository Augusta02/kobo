from datetime import date
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel


class RotationCreate(BaseModel):
    name: str
    num_days: int
    participant_ids: list[UUID]
    remind_days: int | None = None
    split_cost: bool = False


class RotationUpdate(BaseModel):
    name: str | None = None
    num_days: int | None = None
    remind_days: int | None = None
    split_cost: bool | None = None
    participant_ids: list[UUID] | None = None


class RotationComplete(BaseModel):
    amount: Decimal | None = None
    completed_by_member_id: UUID | None = None

class RotationComplete(BaseModel):
    amount: Decimal | None = None
    completed_by_member_id: UUID | None = None
class RotationSplitOut(BaseModel):
    member_id: UUID
    share_amount: Decimal
    paid: bool


class RotationHistoryOut(BaseModel):
    id: UUID
    member_id: UUID
    amount: Decimal | None
    completed_at: date
    splits: list[RotationSplitOut] = []


class RotationOut(BaseModel):
    id: UUID
    name: str
    num_days: int
    remind_days: int | None
    split_cost: bool
    current_member_id: UUID
    next_due_date: date
    is_due: bool
    participant_ids: list[UUID]
    history: list[RotationHistoryOut]