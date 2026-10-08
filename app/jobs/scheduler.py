from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.jobs.reminders import run_reminders


scheduler = AsyncIOScheduler()

def start_scheduler():
    scheduler.add_job(run_reminders, "cron", hour=8, minute=0)
    scheduler.start()

def stop_scheduler():
    scheduler.shutdown()