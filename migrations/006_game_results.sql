create table if not exists game_results (
  id uuid primary key,
  pool_id uuid not null references pools(id) on delete cascade,
  game_id uuid not null references games(id) on delete cascade,
  win_digit int not null,
  lose_digit int not null,
  winning_square_id uuid not null references squares(id) on delete cascade,
  winning_participant_id uuid null references participants(id) on delete set null,
  payout_amount_cents int not null,
  finalized_at timestamptz not null default now(),
  constraint game_results_unique_pool_game unique (pool_id, game_id),
  constraint game_results_win_digit_range check (win_digit >= 0 and win_digit <= 9),
  constraint game_results_lose_digit_range check (lose_digit >= 0 and lose_digit <= 9)
);

create index if not exists game_results_pool_finalized_idx
  on game_results (pool_id, finalized_at desc);

create index if not exists game_results_pool_participant_idx
  on game_results (pool_id, winning_participant_id);

