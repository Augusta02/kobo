create extensions if not exists "pycrypto";

create table households(
    id uuid primary key default gen_random_uuid(),
    name text not null,
    created_at timestamptz not null default now()
);

create table members(
    id uuid primary key default gen_random_uuid(),
    household_id_uuid not null references households(id) on delete cascade,
    firebase_uid text not null unique,
    display_name text not null,
    is_admin boolean not null default false,
    joined_at timestamptz not null default now()
);