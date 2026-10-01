create table invites(
    code text primary key, 
    household_id uuid not null references households(id) on delete cascade, 
    created_at timestamptz not null default now(),
    expires_at timestamptz not null,
    used_by uuid references members(id)
);