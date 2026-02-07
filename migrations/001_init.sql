create table if not exists pools (
  id uuid primary key,
  name text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists squares (
  id uuid primary key,
  pool_id uuid not null references pools(id) on delete cascade,
  row_index int not null,
  col_index int not null,
  owner_name text null,
  created_at timestamptz not null default now(),
  constraint squares_unique_cell unique (pool_id, row_index, col_index)
);
