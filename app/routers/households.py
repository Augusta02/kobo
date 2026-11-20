import secrets
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import get_current_user
from app.db.pool import get_pool
from app.schemas.household import HouseholdCreate, HouseholdOut, InviteAccept, InviteOut, MemberOut, BalanceOut
from app.services.balances import simplify_debts


router = APIRouter(tags=['households'])

@router.get("/households/me", response_model=list[HouseholdOut])
async def list_my_households(uid: str = Depends(get_current_user)):
    async with get_pool().acquire() as conn:
        rows = await conn.fetch(
            "SELECT h.id, h.name, h.created_at FROM households h "
            "JOIN members m ON m.household_id = h.id WHERE m.firebase_uid = $1",
            uid,
        )
    return [dict(r) for r in rows]

# Create a household and add the creator as an admin member
@router.post("/households", response_model=HouseholdOut, status_code=status.HTTP_201_CREATED)
async def create_household(body: HouseholdCreate, uid: str = Depends(get_current_user)):
    async with get_pool().acquire() as conn, conn.transaction():
        household = await conn.fetchrow(
            "insert into households (name) values ($1) returning id, name, created_at",
            body.name,
        )
        await conn.execute(
                "INSERT INTO members (household_id, firebase_uid, display_name, is_admin) VALUES ($1, $2, $3, $4)",
                household["id"], uid,body.display_name, True
            )
        
    return dict(household)

# Create an invite for a household, only accessible to admins of that household
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

#  Accept an invite to join a household
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
            "returning id, household_id, display_name, is_admin, joined_at, firebase_uid",
            invite["household_id"], uid, body.display_name
        )
        
        await conn.execute(
            "update invites set used_by = $1 where code = $2", member['id'], code
        )
    return dict(member)

# List all members of a household, only accessible to members of that household
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
            "SELECT id, household_id, display_name, is_admin, joined_at, firebase_uid FROM members WHERE household_id=$1",
            household_id
        )
    return [dict(m) for m in members]

# transfer adminship from current admin to another member
# only one admin exists in an household at a time, so this will set the current admin to false and the target member to true
@router.post("/households/{household_id}/members/{member_id}/transfer-admin", response_model=MemberOut)
async def transfer_admin(household_id: str, member_id: str, uid: str = Depends(get_current_user)):
    async with get_pool().acquire() as conn, conn.transaction():
        requester = await conn.fetchrow(
            "SELECT is_admin FROM members WHERE household_id=$1 AND firebase_uid=$2",
            household_id, uid,
        )
        if requester is None:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not a member of this household")
        if not requester["is_admin"]:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the current admin can transfer adminship")

        target = await conn.fetchrow(
            "SELECT id FROM members WHERE id=$1 AND household_id=$2", member_id, household_id,
        )
        if target is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found in this household")

        await conn.execute(
            "UPDATE members SET is_admin=false WHERE household_id=$1 AND is_admin=true",
            household_id,
        )
        member = await conn.fetchrow(
            "UPDATE members SET is_admin=true WHERE id=$1 "
            "RETURNING id, household_id, display_name, is_admin, joined_at, firebase_uid",
            member_id,
        )
    return dict(member)

# Who owes whom, simplified to the fewest transactions needed to settle up.
# Scoped to ad-hoc expenses only — bills and rotations aren't person-to-person
# debts until someone actually fronts the money, so they don't belong in this ledger.
@router.get("/households/{household_id}/balances", response_model=list[BalanceOut])
async def get_household_balances(household_id: str, uid: str = Depends(get_current_user)):
    async with get_pool().acquire() as conn:
        requester = await conn.fetchrow(
            "SELECT 1 FROM members WHERE household_id=$1 AND firebase_uid=$2",
            household_id, uid
        )
        if not requester:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this household")

        net: dict = {}

        expense_split_rows = await conn.fetch(
            "SELECT es.member_id, es.share_amount FROM expense_splits es "
            "JOIN expenses e ON e.id = es.expense_id WHERE e.household_id = $1",
            household_id,
        )
        for row in expense_split_rows:
            net[row["member_id"]] = net.get(row["member_id"], Decimal("0")) - row["share_amount"]

        expense_contribution_rows = await conn.fetch(
            "SELECT ec.member_id, ec.amount_contributed FROM expense_contributions ec "
            "JOIN expenses e ON e.id = ec.expense_id WHERE e.household_id = $1",
            household_id,
        )
        for row in expense_contribution_rows:
            net[row["member_id"]] = net.get(row["member_id"], Decimal("0")) + row["amount_contributed"]

        return simplify_debts(net)