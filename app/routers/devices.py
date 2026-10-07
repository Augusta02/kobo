from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_user
from app.db.pool import get_pool
from app.schemas.device import DeviceTokenCreate, DeviceTokenOut

router = APIRouter(tags=["devices"])


@router.post("/devices", response_model=DeviceTokenOut, status_code=status.HTTP_201_CREATED)
async def register_device(payload: DeviceTokenCreate, uid: str = Depends(get_current_user)):
    async with get_pool().acquire() as conn:
        member = await conn.fetchrow(
            "SELECT id FROM members WHERE id=$1 AND firebase_uid=$2",
            payload.member_id, uid,
        )
        if not member:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Token can only be registered for your own member_id")

        row = await conn.fetchrow(
            "INSERT INTO device_tokens (member_id, token) VALUES ($1, $2) "
            "ON CONFLICT (token) DO UPDATE SET member_id = EXCLUDED.member_id "
            "RETURNING id, member_id, token",
            payload.member_id, payload.token,
        )
        return dict(row)


@router.delete("/devices/{token}", status_code=status.HTTP_204_NO_CONTENT)
async def unregister_device(token: str, uid: str = Depends(get_current_user)):
    async with get_pool().acquire() as conn:
        result = await conn.execute(
            "DELETE FROM device_tokens USING members "
            "WHERE device_tokens.token=$1 AND device_tokens.member_id = members.id AND members.firebase_uid=$2",
            token, uid,
        )
        if result == "DELETE 0":
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Token not found")