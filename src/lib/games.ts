import { randomUUID } from 'crypto';

import type { DbClient, GameRow } from './types';

export const GAME_ROUND_KEYS = [
  'round_of_64',
  'round_of_32',
  'sweet_16',
  'elite_8',
  'final_4',
  'championship'
] as const;

export type GameRoundKey = (typeof GAME_ROUND_KEYS)[number];

export const GAME_ROUND_LABELS: Record<GameRoundKey, string> = {
  round_of_64: 'Round of 64',
  round_of_32: 'Round of 32',
  sweet_16: 'Sweet 16',
  elite_8: 'Elite 8',
  final_4: 'Final 4',
  championship: 'Championship'
};

export const GAME_STATUSES = ['scheduled', 'in_progress', 'final'] as const;
export type GameStatus = (typeof GAME_STATUSES)[number];

export function isValidRoundKey(roundKey: string): roundKey is GameRoundKey {
  return GAME_ROUND_KEYS.includes(roundKey as GameRoundKey);
}

export function isValidStatus(status: string): status is GameStatus {
  return GAME_STATUSES.includes(status as GameStatus);
}

export function parseScore(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error('invalid_score');
  }
  return parsed;
}

export function parseStartTime(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('invalid_start_time');
  }
  return parsed;
}

export async function createGame(
  db: DbClient,
  poolId: string,
  data: {
    round_key: GameRoundKey;
    team_a: string;
    team_b: string;
    status: GameStatus;
    score_a: number | null;
    score_b: number | null;
    start_time: Date | null;
    external_id?: string | null;
  }
): Promise<GameRow> {
  const id = randomUUID();
  const result = await db.query(
    `insert into games (id, pool_id, round_key, team_a, team_b, score_a, score_b, status, start_time, external_id)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     returning *`,
    [
      id,
      poolId,
      data.round_key,
      data.team_a,
      data.team_b,
      data.score_a,
      data.score_b,
      data.status,
      data.start_time,
      data.external_id ?? null
    ]
  );
  return result.rows[0] as GameRow;
}

export async function listGames(db: DbClient, poolId: string): Promise<GameRow[]> {
  const result = await db.query(
    `select * from games
     where pool_id = $1
     order by round_key asc, start_time asc nulls last, updated_at desc`,
    [poolId]
  );
  return result.rows as GameRow[];
}

export async function updateGame(
  db: DbClient,
  poolId: string,
  gameId: string,
  updates: Partial<{
    round_key: GameRoundKey;
    team_a: string;
    team_b: string;
    status: GameStatus;
    score_a: number | null;
    score_b: number | null;
    start_time: Date | null;
    external_id: string | null;
  }>
): Promise<GameRow> {
  const fields: string[] = [];
  const params: Array<string | number | Date | null> = [];
  let paramIndex = 1;

  const pushField = (column: string, value: string | number | Date | null) => {
    fields.push(`${column} = $${paramIndex}`);
    params.push(value);
    paramIndex += 1;
  };

  if (updates.round_key) pushField('round_key', updates.round_key);
  if (updates.team_a !== undefined) pushField('team_a', updates.team_a);
  if (updates.team_b !== undefined) pushField('team_b', updates.team_b);
  if (updates.score_a !== undefined) pushField('score_a', updates.score_a);
  if (updates.score_b !== undefined) pushField('score_b', updates.score_b);
  if (updates.status) pushField('status', updates.status);
  if (updates.start_time !== undefined) pushField('start_time', updates.start_time);
  if (updates.external_id !== undefined) pushField('external_id', updates.external_id);

  pushField('updated_at', new Date());

  const result = await db.query(
    `update games set ${fields.join(', ')} where id = $${paramIndex} and pool_id = $${paramIndex + 1} returning *`,
    [...params, gameId, poolId]
  );

  if (result.rows.length === 0) {
    throw new Error('game_not_found');
  }

  return result.rows[0] as GameRow;
}

export async function deleteGame(db: DbClient, poolId: string, gameId: string) {
  await db.query('delete from games where id = $1 and pool_id = $2', [gameId, poolId]);
}
