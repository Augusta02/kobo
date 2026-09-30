import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import get_current_user
from app.db.pool import get_pool
from app.schemas.household import HouseholdCreate, HouseholdOut, InviteAccept, InviteOut, MemberOut


router = APIRouter(tags=['households'])

@router.post("/households", response_model=HouseholdOut, status_code=status.HTTP_201_CREATED)
async def create_household(body: HouseholdCreate, uid: str = Depends(get_current_user)):
    async with get_pool().acquire() as conn, conn.transaction():
        household = await conn.fetchrow(
            "insert into households (name) values ($1) returning id, name, created_at",
            body.name,
        )
        await conn.execute(
                "INSERT INTO members (household_id, firebase_uid, display_name, is_admin) VALUES ($1, $2, $3, $4)",
                household_id["id"], uid,body.display_name, True
            )
        
    return household


@router.post("/households/{household_id}/invite", response_model=InviteOut)
async def create_invite(household_id: str, uid: str = Depends(get_current_user)):
    async with get_pool().acquire() as conn:
        member = await conn.fetchrow(
            "SELECT is_admin FROM members WHERE household_id=$1 AND firebase_uid=$2",
            household_id, uid
        )
        if not member or not member["is_admin"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to create invite")
        
        code = secrets.token_urlsafe(6)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
        await conn.execute(
            "INSERT INTO invites (code, household_id, expires_at) VALUES ($1, $2, $3)",
            code, household_id, expires_at
        )
    return {"code": code, "expires_at": expires_at}


@router.post("/invites/{code}/accept", response_model=MemberOut)
async def accept_invite(code: str, body: InviteAccept, uid: str = Depends(get_current_user)):
    async with get_pool().acquire() as conn, conn.transaction():
        invite = await conn.fetchrow(
            "SELECT household_id, expires_at, used_by FROM invites WHERE code=$1",
            code
        )
        if invite is None: 
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")
        if invite["used_by"] is not None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invite already used")
        if invite["expires_at"] < datetime.now(timezone.utc):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found or expired")
        
        member = await conn.fetchrow(
            "INSERT INTO members (household_id, firebase_uid, display_name) VALUES ($1, $2, $3) " 
            "returning id, household_id, display_name, is_admin, joined_at",
            invite["household_id"], uid, body.display_name
        )
        
        await conn.execute(
            "update invites set used_by = $1 where code = $2", member['id'], code
        )
    return member

@router.get("/households/{household_id}/members", response_model=list[MemberOut])
async def list_members(household_id: str, uid: str = Depends(get_current_user)):
    async with get_pool().acquire() as conn:
        requester = await conn.fetchrow(
            "SELECT 1 FROM members WHERE household_id=$1 AND firebase_uid=$2",
            household_id, uid
        )
        if not requester:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this household")
        
        members = await conn.fetch(
            "SELECT household_id, display_name, is_admin, joined_at FROM members WHERE household_id=$1",
            household_id
        )
    return members