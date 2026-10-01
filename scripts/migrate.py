import asyncio 
from pathlib import Path
import asyncpg
from app.core.config import get_settings

MIGRATIONS_DIR = Path(__file__).parent.parent / "app" / "db" / "migrations"

async def run_migrations() -> None:
    settings = get_settings()
    conn = await asyncpg.connect(dsn=settings.database_url)
    try:
        await conn.execute(
            'create table if not exists schema_migrations'
            '(filename text primary key, applied_at timestamp with time zone default now())'
        )
        applied = {r['filename'] for r in await conn.fetch('select filename from schema_migrations')}

        for path in sorted(MIGRATIONS_DIR.glob("*.sql")):
            if path.name in applied:
                continue
            print(f"Applying {path.name}")
            await conn.execute(path.read_text())
            await conn.execute(
                'insert into schema_migrations (filename) values ($1)', path.name
            ) 
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(run_migrations())