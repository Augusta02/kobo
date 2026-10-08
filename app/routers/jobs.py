from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.jobs.reminders import run_reminders

router= APIRouter(tags=["jobs"])

@router.post("/jobs/reminders/run")
async def trigger_reminders(uid: str = Depends(get_current_user)):
    await run_reminders()
    return {"status": "ran"}