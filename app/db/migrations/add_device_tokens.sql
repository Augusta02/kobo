create table device_tokens (
    id uuid primary key default gen_random_uuid(),
    member_id uuid not null references members(id) on delete cascade,
    token text not null unique,
    created_at timestamptz not null default now()
);