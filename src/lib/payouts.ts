import { randomUUID } from 'crypto';

import type { DbClient } from './types';

export const ROUND_KEYS = [
  'round_of_64',
  'round_of_32',
  'sweet_16',
  'elite_8',
  'final_4',
  'championship'
] as const;

export type RoundKey = (typeof ROUND_KEYS)[number];

export const DEFAULT_PAYOUTS_CENTS: Record<RoundKey, number> = {
  round_of_64: 2500,
  round_of_32: 4000,
  sweet_16: 5000,
  elite_8: 6000,
  final_4: 8000,
  championship: 26000
};

export const ROUND_LABELS: Record<RoundKey, string> = {
  round_of_64: 'Round of 64',
  round_of_32: 'Round of 32',
  sweet_16: 'Sweet 16',
  elite_8: 'Elite 8',
  final_4: 'Final 4',
  championship: 'Championship'
};

export type LatestPayouts = {
  payouts: Record<RoundKey, number>;
  last_updated: Date | null;
};

export async function seedDefaultPayouts(db: DbClient, poolId: string) {
  const values: string[] = [];
  const params: Array<string | number> = [];
  let paramIndex = 1;

  for (const roundKey of ROUND_KEYS) {
    values.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3})`);
    params.push(randomUUID(), poolId, roundKey, DEFAULT_PAYOUTS_CENTS[roundKey]);
    paramIndex += 4;
  }

  await db.query(
    `insert into payout_configs (id, pool_id, round_key, amount_cents)
     values ${values.join(', ')}`,
    params
  );
}

export async function getLatestPayouts(db: DbClient, poolId: string): Promise<LatestPayouts> {
  const result = await db.query(
    'select round_key, amount_cents, effective_at from payout_configs where pool_id = $1',
    [poolId]
  );

  const payouts = {} as Record<RoundKey, number>;
  const latestByRound = new Map<RoundKey, { amount: number; effectiveAt: Date }>();
  let lastUpdated: Date | null = null;

  for (const row of result.rows) {
    const roundKey = row.round_key as RoundKey;
    if (!ROUND_KEYS.includes(roundKey)) {
      continue;
    }
    const effectiveAt = row.effective_at ? new Date(row.effective_at) : new Date(0);
    const current = latestByRound.get(roundKey);
    if (!current || effectiveAt > current.effectiveAt) {
      latestByRound.set(roundKey, { amount: Number(row.amount_cents), effectiveAt });
    }
  }

  for (const roundKey of ROUND_KEYS) {
    const current = latestByRound.get(roundKey);
    if (!current) {
      throw new Error('payouts_missing');
    }
    payouts[roundKey] = current.amount;
    if (!lastUpdated || current.effectiveAt > lastUpdated) {
      lastUpdated = current.effectiveAt;
    }
  }

  return { payouts, last_updated: lastUpdated };
}

export function validatePayoutPayload(payload: unknown): Record<RoundKey, number> {
  if (!payload || typeof payload !== 'object') {
    throw new Error('invalid_payload');
  }

  const data = payload as { payouts?: Record<string, unknown> };
  if (!data.payouts || typeof data.payouts !== 'object' || Array.isArray(data.payouts)) {
    throw new Error('invalid_payload');
  }

  const keys = Object.keys(data.payouts);
  const unknownKeys = keys.filter((key) => !ROUND_KEYS.includes(key as RoundKey));
  if (unknownKeys.length > 0) {
    throw new Error('unknown_round_key');
  }

  for (const roundKey of ROUND_KEYS) {
    if (!(roundKey in data.payouts)) {
      throw new Error('missing_round_key');
    }
  }

  const payouts = {} as Record<RoundKey, number>;
  for (const roundKey of ROUND_KEYS) {
    const value = Number((data.payouts as Record<string, unknown>)[roundKey]);
    if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
      throw new Error('invalid_amount');
    }
    payouts[roundKey] = value;
  }

  return payouts;
}
