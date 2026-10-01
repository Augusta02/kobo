from datetime import datetime
from uuid import UUID
from pydantic import BaseModel

class HouseholdCreate(BaseModel):
    name: str
    display_name: str


class HouseholdOut(BaseModel):
    id: UUID
    name: str
    created_at: datetime

class MemberOut(BaseModel):
    id: UUID
    household_id: UUID
    display_name: str
    is_admin: bool
    joined_at: datetime

class InviteOut(BaseModel):
    code: str
    expires_at: datetime

class InviteAccept(BaseModel):
    display_name: str
