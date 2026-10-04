from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class ContributionIn(BaseModel):
    member_id: UUID
    amount_contributed: Decimal


class BillCreate(BaseModel):
    name: str
    total_amount: Decimal
    num_days: int
    participant_ids: list[UUID]
    contributions: list[ContributionIn] = []


class BillUpdate(BaseModel):
    name: str | None = None
    total_amount: Decimal | None = None
    num_days: int | None = None
    participant_ids: list[UUID] | None = None
    contributions: list[ContributionIn] | None = None


class ContributionOut(BaseModel):
    member_id: UUID
    amount_contributed: Decimal


class BillSplitOut(BaseModel):
    member_id: UUID
    share_amount: Decimal
    paid: bool


class BillOut(BaseModel):
    id: UUID
    name: str
    total_amount: Decimal
    num_days: int
    created_at: datetime
    contributions: list[ContributionOut]
    splits: list[BillSplitOut]