import { getDigitMap, isValidPermutation } from './digits';
import { ROUND_KEYS } from './payouts';
import type { DbClient } from './types';

export type PoolLockPrerequisiteCode =
  | 'squares_unassigned'
  | 'participants_missing'
  | 'digits_not_randomized'
  | 'payouts_missing';

export type PoolLockPrerequisites = {
  squares_assigned: boolean;
  participants_exist: boolean;
  digits_randomized: boolean;
  payouts_configured: boolean;
};

export type PoolLockPrerequisitesCheck = {
  ok: boolean;
  failed: PoolLockPrerequisiteCode[];
  prerequisites: PoolLockPrerequisites;
  details: {
    total_squares: number;
    assigned_squares: number;
    participant_count: number;
    digit_map_exists: boolean;
    winning_digits_valid: boolean;
    losing_digits_valid: boolean;
    payout_rounds_present: string[];
    payout_rounds_missing: string[];
  };
};

export async function checkPoolLockPrerequisites(
  db: DbClient,
  poolId: string
): Promise<PoolLockPrerequisitesCheck> {
  const squaresResult = await db.query(
    'select count(*)::int as total, count(participant_id)::int as assigned from squares where pool_id = $1',
    [poolId]
  );
  const totalSquares = Number(squaresResult.rows[0]?.total ?? 0);
  const assignedSquares = Number(squaresResult.rows[0]?.assigned ?? 0);

  const participantsResult = await db.query(
    'select count(*)::int as count from participants where pool_id = $1',
    [poolId]
  );
  const participantCount = Number(participantsResult.rows[0]?.count ?? 0);

  const digitMap = await getDigitMap(db, poolId);
  const digitMapExists = Boolean(digitMap);
  const winningValid = Boolean(digitMap && isValidPermutation(digitMap.winning_digits));
  const losingValid = Boolean(digitMap && isValidPermutation(digitMap.losing_digits));
  const digitsRandomized = digitMapExists && winningValid && losingValid;

  const payoutRoundsResult = await db.query(
    'select distinct round_key from payout_configs where pool_id = $1',
    [poolId]
  );
  const present = payoutRoundsResult.rows.map((row) => String(row.round_key));
  const presentSet = new Set(present);
  const missing = ROUND_KEYS.filter((key) => !presentSet.has(key));
  const payoutsConfigured = missing.length === 0;

  const prerequisites: PoolLockPrerequisites = {
    squares_assigned: totalSquares === 100 && assignedSquares === 100,
    participants_exist: participantCount > 0,
    digits_randomized: digitsRandomized,
    payouts_configured: payoutsConfigured
  };

  const failed: PoolLockPrerequisiteCode[] = [];
  if (!prerequisites.squares_assigned) failed.push('squares_unassigned');
  if (!prerequisites.participants_exist) failed.push('participants_missing');
  if (!prerequisites.digits_randomized) failed.push('digits_not_randomized');
  if (!prerequisites.payouts_configured) failed.push('payouts_missing');

  return {
    ok: failed.length === 0,
    failed,
    prerequisites,
    details: {
      total_squares: totalSquares,
      assigned_squares: assignedSquares,
      participant_count: participantCount,
      digit_map_exists: digitMapExists,
      winning_digits_valid: winningValid,
      losing_digits_valid: losingValid,
      payout_rounds_present: present.sort(),
      payout_rounds_missing: [...missing]
    }
  };
}

export async function isPoolLocked(db: DbClient, poolId: string): Promise<boolean> {
  const result = await db.query('select status from pools where id = $1', [poolId]);
  if (result.rows.length === 0) return false;
  return String(result.rows[0]?.status ?? '') === 'locked';
}
