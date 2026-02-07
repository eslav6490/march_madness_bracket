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
