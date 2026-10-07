create table rotations (
    id uuid primary key default gen_random_uuid(),
    household_id uuid not null references households(id) on delete cascade,
    name text not null,
    interval_days integer not null,
    current_position integer not null default 0,
    last_completed_at date,
    created_at timestamptz not null default now()
);

create table rotation_members (
    id uuid primary key default gen_random_uuid(),
    rotation_id uuid not null references rotations(id) on delete cascade,
    member_id uuid not null references members(id),
    position integer not null,
    unique (rotation_id, position),
    unique (rotation_id, member_id)
);

create table rotation_history (
    id uuid primary key default gen_random_uuid(),
    rotation_id uuid not null references rotations(id) on delete cascade,
    member_id uuid not null references members(id),
    amount numeric(12,2),
    completed_at date not null default current_date
);