from datetime import date
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel


class RotationCreate(BaseModel):
    name: str
    num_days: int
    participant_ids: list[UUID]


class RotationComplete(BaseModel):
    amount: Decimal | None = None


class RotationHistoryOut(BaseModel):
    member_id: UUID
    amount: Decimal | None
    completed_at: date


class RotationOut(BaseModel):
    id: UUID
    name: str
    num_days: int
    current_member_id: UUID
    next_due_date: date
    is_due: bool
    participant_ids: list[UUID]
    history: list[RotationHistoryOut]