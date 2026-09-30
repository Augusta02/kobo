from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.db import pool


@asynccontextmanager
async def lifespan(app: FastAPI):
    await pool.connect()
    yield
    await pool.disconnect()


app = FastAPI(lifespan=lifespan)

@app.get("/health")
async def health_check():
    return {"status": "ok"}