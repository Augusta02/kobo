from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.db import pool
from app.core.firebase import init_firebase
from app.routers import households

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_firebase()
    await pool.connect()
    yield
    await pool.disconnect()


app = FastAPI(lifespan=lifespan)
app.include_router(households.router)

@app.get("/health")
async def health_check():
    return {"status": "ok"}