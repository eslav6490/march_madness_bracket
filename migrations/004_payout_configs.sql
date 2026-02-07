create table if not exists payout_configs (
  id uuid primary key,
  pool_id uuid not null references pools(id) on delete cascade,
  round_key text not null,
  amount_cents int not null,
  effective_at timestamptz not null default now()
);

create index if not exists payout_configs_pool_round_effective_idx
  on payout_configs (pool_id, round_key, effective_at desc);
