import asyncpg
from app.core.config import get_settings

_pool: asyncpg.Pool | None = None

async def connect() -> None:
    global _pool
    settings = get_settings()
    _pool = await asyncpg.create_pool(dsn=settings.database_url)


async def disconnect() -> None:
    if _pool is not None:
        await _pool.close()

def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("Database pool is not initialized. Call connect() first.")
    return _pool