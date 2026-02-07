create table if not exists participants (
  id uuid primary key,
  pool_id uuid not null references pools(id) on delete cascade,
  display_name text not null,
  contact_info text null,
  created_at timestamptz not null default now()
);

alter table squares
  add column if not exists participant_id uuid references participants(id) on delete set null;

create index if not exists squares_pool_participant_idx on squares (pool_id, participant_id);
