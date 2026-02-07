import type { DbClient, DigitMapRow } from './types';

const DIGITS = Array.from({ length: 10 }, (_, index) => index);

export function generatePermutation(): number[] {
  const result = [...DIGITS];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function isValidPermutation(values: number[]): boolean {
  if (values.length !== 10) return false;
  const unique = new Set(values);
  if (unique.size !== 10) return false;
  for (const digit of DIGITS) {
    if (!unique.has(digit)) return false;
  }
  return true;
}

export async function getDigitMap(db: DbClient, poolId: string): Promise<DigitMapRow | null> {
  const result = await db.query(
    'select pool_id, winning_digits, losing_digits, revealed_at, locked_at, created_at from digit_maps where pool_id = $1',
    [poolId]
  );
  if (result.rows.length === 0) return null;
  return mapDigitMapRow(result.rows[0]);
}

export async function upsertDigitMap(
  db: DbClient,
  poolId: string,
  winningDigits: number[],
  losingDigits: number[]
): Promise<DigitMapRow> {
  const result = await db.query(
    `insert into digit_maps (pool_id, winning_digits, losing_digits)
     values ($1, $2::jsonb, $3::jsonb)
     on conflict (pool_id)
     do update set
       winning_digits = excluded.winning_digits,
       losing_digits = excluded.losing_digits
     returning pool_id, winning_digits, losing_digits, revealed_at, locked_at, created_at`,
    [poolId, JSON.stringify(winningDigits), JSON.stringify(losingDigits)]
  );

  return mapDigitMapRow(result.rows[0]);
}

export async function revealDigitMap(db: DbClient, poolId: string): Promise<DigitMapRow> {
  const result = await db.query(
    `update digit_maps
        set revealed_at = coalesce(revealed_at, now())
      where pool_id = $1
      returning pool_id, winning_digits, losing_digits, revealed_at, locked_at, created_at`,
    [poolId]
  );
  if (result.rows.length === 0) {
    throw new Error('digit_map_missing');
  }
  return mapDigitMapRow(result.rows[0]);
}

export async function lockDigitMap(db: DbClient, poolId: string): Promise<DigitMapRow> {
  const result = await db.query(
    `update digit_maps
        set locked_at = coalesce(locked_at, now())
      where pool_id = $1
      returning pool_id, winning_digits, losing_digits, revealed_at, locked_at, created_at`,
    [poolId]
  );
  if (result.rows.length === 0) {
    throw new Error('digit_map_missing');
  }
  return mapDigitMapRow(result.rows[0]);
}

export function isDigitsVisible(map: DigitMapRow | null): boolean {
  return Boolean(map && (map.revealed_at || map.locked_at));
}

export function normalizeDigits(input: unknown): number[] {
  if (Array.isArray(input)) {
    return input.map((value) => Number(value));
  }
  if (typeof input === 'string') {
    const parsed = JSON.parse(input) as unknown[];
    return parsed.map((value) => Number(value));
  }
  return [];
}

function mapDigitMapRow(row: any): DigitMapRow {
  return {
    pool_id: row.pool_id as string,
    winning_digits: normalizeDigits(row.winning_digits),
    losing_digits: normalizeDigits(row.losing_digits),
    revealed_at: row.revealed_at ? new Date(row.revealed_at) : null,
    locked_at: row.locked_at ? new Date(row.locked_at) : null,
    created_at: row.created_at ? new Date(row.created_at) : null
  };
}
