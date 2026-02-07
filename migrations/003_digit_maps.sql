create table if not exists digit_maps (
  pool_id uuid primary key references pools(id) on delete cascade,
  winning_digits jsonb not null,
  losing_digits jsonb not null,
  revealed_at timestamptz null,
  locked_at timestamptz null,
  created_at timestamptz not null default now()
);
