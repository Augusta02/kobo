create table bills(
    id uuid primary key default gen_random_uuid(),
    household_id uuid not null references households(id) on delete cascade,
    name text not null, 
    total_amount numeric(12, 2) not null,
    num_days integer not null,
    created_at timestamptz not null default now()
);

create table bill_splits (
    id uuid primary key default gen_random_uuid(),
    bill_id uuid not null references bills(id) on delete cascade,
    member_id uuid not null references members(id),
    share_amount integer not null,
    paid boolean not null default false
);