import asyncio
from pathlib import Path

import asyncpg

from app.core.config import get_settings

MIGRATIONS_DIR = Path(__file__).parent.parent / "app" / "db" / "migrations"

# Applied top to bottom. Add new filenames to the end as they're created,
# order lives here now, not in the filenames.
MIGRATION_ORDER = [
    "init.sql",
    "add_invites.sql",
    "add_bills.sql",
    "bill_contributions.sql",
    "one_admin_per_household.sql",
]


async def run_migrations() -> None:
    on_disk = {p.name for p in MIGRATIONS_DIR.glob("*.sql")}
    unlisted = on_disk - set(MIGRATION_ORDER)
    if unlisted:
        raise RuntimeError(f"Found .sql files not listed in MIGRATION_ORDER: {unlisted}")

    settings = get_settings()
    conn = await asyncpg.connect(dsn=settings.database_url)
    try:
        await conn.execute(
            "create table if not exists schema_migrations "
            "(filename text primary key, applied_at timestamptz not null default now())"
        )
        applied = {r["filename"] for r in await conn.fetch("select filename from schema_migrations")}

        for filename in MIGRATION_ORDER:
            if filename in applied:
                continue
            path = MIGRATIONS_DIR / filename
            if not path.exists():
                raise RuntimeError(f"{filename} is in MIGRATION_ORDER but missing from disk")
            print(f"Applying {filename}")
            await conn.execute(path.read_text())
            await conn.execute("insert into schema_migrations (filename) values ($1)", filename)
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(run_migrations())
