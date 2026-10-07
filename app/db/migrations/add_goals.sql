create table goals (
    id uuid primary key default gen_random_uuid(),
    household_id uuid not null references households(id) on delete cascade,
    name text not null,
    target_amount numeric(12,2) not null,
    created_at timestamptz not null default now()
);

create table goal_participants (
    goal_id uuid not null references goals(id) on delete cascade,
    member_id uuid not null references members(id),
    share_amount numeric(12,2) not null,
    primary key (goal_id, member_id)
);

create table goal_contributions (
    id uuid primary key default gen_random_uuid(),
    goal_id uuid not null references goals(id) on delete cascade,
    member_id uuid not null references members(id),
    amount numeric(12,2) not null,
    contributed_at timestamptz not null default now()
);