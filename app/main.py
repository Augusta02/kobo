from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.db import pool
from app.core.firebase import init_firebase
from app.jobs.scheduler import stop_scheduler, start_scheduler
from app.routers import bills, expenses, households, rotations, goals, devices, jobs

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_firebase()
    await pool.connect()
    start_scheduler()
    yield
    stop_scheduler()
    await pool.disconnect()


app = FastAPI(lifespan=lifespan)
app.include_router(households.router)
app.include_router(bills.router)
app.include_router(expenses.router)
app.include_router(rotations.router)
app.include_router(goals.router)
app.include_router(devices.router)
app.include_router(jobs.router)

@app.get("/health")
async def health_check():
    return {"status": "ok"}
