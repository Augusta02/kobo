from uuid import UUID
from pydantic import BaseModel

class DeviceTokenCreate(BaseModel):
    member_id: UUID
    token: str

class DeviceTokenOut(BaseModel):
    id: UUID
    member_id: UUID
    token: str
    created_at: str