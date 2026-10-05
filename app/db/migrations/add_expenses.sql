create table expenses (
    id uuid primary key default gen_random_uuid(),
    household_id uuid not null references households(id) on delete cascade,
    name text not null,
    category text not null,
    total_amount numeric(12,2) not null,
    s3_key text,
    created_at timestamptz not null default now()
);

create table expense_contributions (
    id uuid primary key default gen_random_uuid(),
    expense_id uuid not null references expenses(id) on delete cascade,
    member_id uuid not null references members(id),
    amount_contributed numeric(12,2) not null,
    unique (expense_id, member_id)
);

create table expense_splits (
    id uuid primary key default gen_random_uuid(),
    expense_id uuid not null references expenses(id) on delete cascade,
    member_id uuid not null references members(id),
    share_amount numeric(12,2) not null,
    paid boolean not null default false
);