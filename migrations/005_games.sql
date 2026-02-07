create table if not exists games (
  id uuid primary key,
  pool_id uuid not null references pools(id) on delete cascade,
  round_key text not null,
  team_a text not null,
  team_b text not null,
  score_a int null,
  score_b int null,
  status text not null,
  start_time timestamptz null,
  external_id text null,
  updated_at timestamptz not null default now()
);

create index if not exists games_pool_round_idx on games (pool_id, round_key);
create index if not exists games_pool_status_idx on games (pool_id, status);
