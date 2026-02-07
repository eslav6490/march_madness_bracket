create table if not exists audit_events (
  id uuid primary key,
  pool_id uuid null references pools(id) on delete set null,
  actor text not null,
  action text not null,
  entity_type text null,
  entity_id text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_events_pool_created_idx
  on audit_events (pool_id, created_at desc, id desc);

