create table invites(
    code text primary key, 
    household_id_uuid not null references houshold(id) on delete cascade, 
    created_at timestamptz not null default now(),
    expires_at timestamptz not null,
    used_by uuid references members(id)
);