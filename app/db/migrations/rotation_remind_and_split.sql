do $$
begin
    if exists (
        select 1 from information_schema.columns
        where table_name = 'rotations' and column_name = 'interval_days'
    ) then
        alter table rotations rename column interval_days to num_days;
    end if;
end $$;

alter table bills add column if not exists remind_days integer;
alter table rotations add column if not exists remind_days integer;
alter table rotations add column if not exists split_cost boolean not null default false;

create table if not exists rotation_history_splits (
    id uuid primary key default gen_random_uuid(),
    history_id uuid not null references rotation_history(id) on delete cascade,
    member_id uuid not null references members(id),
    share_amount numeric(12,2) not null,
    paid boolean not null default false
);