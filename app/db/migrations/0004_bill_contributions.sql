
create table bill_contributions (
    id uuid primary key default gen_random_uuid(),
    bill_id uuid not null references bills(id) on delete cascade,
    member_id uuid not null references members(id),
    amount_contributed numeric(12,2) not null,
    unique (bill_id, member_id)
);