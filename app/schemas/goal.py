from datetime import datetime
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel


class GoalCreate(BaseModel):
    name: str
    target_amount: Decimal
    participant_ids: list[UUID]

class GoalUpdate(BaseModel):
    name: str | None = None
    target_amount: Decimal | None = None


class ContributionCreate(BaseModel):
    member_id: UUID
    amount: Decimal


class ContributionOut(BaseModel):
    member_id: UUID
    amount: Decimal
    contributed_at: datetime


class ParticipantOut(BaseModel):
    member_id: UUID
    share_amount: Decimal
    contributed_so_far: Decimal
    remaining: Decimal
    is_complete: bool


class GoalOut(BaseModel):
    id: UUID
    name: str
    target_amount: Decimal
    total_saved: Decimal
    is_complete: bool
    participants: list[ParticipantOut]
    contributions: list[ContributionOut]