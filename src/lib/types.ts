export type DbClient = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: any[] }>;
};

export type DbTransactionClient = DbClient & {
  release?: () => void;
};

export type DbPool = DbClient & {
  connect: () => Promise<DbTransactionClient>;
};

export type PoolRow = {
  id: string;
  name: string;
  status: string;
  created_at: Date;
};

export type ParticipantRow = {
  id: string;
  pool_id: string;
  display_name: string;
  contact_info: string | null;
  created_at: Date;
  square_count?: number;
};

export type DigitMapRow = {
  pool_id: string;
  winning_digits: number[];
  losing_digits: number[];
  revealed_at: Date | null;
  locked_at: Date | null;
  created_at: Date | null;
};

export type GameRow = {
  id: string;
  pool_id: string;
  round_key: string;
  team_a: string;
  team_b: string;
  score_a: number | null;
  score_b: number | null;
  status: string;
  start_time: Date | null;
  external_id: string | null;
  updated_at: Date;
};

export type SquareRow = {
  id: string;
  pool_id: string;
  row_index: number;
  col_index: number;
  participant_id: string | null;
  participant_name: string | null;
  created_at: Date;
};

export type PoolWithSquares = {
  pool: PoolRow;
  squares: SquareRow[];
};
