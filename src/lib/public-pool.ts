import { getDigitMap, isDigitsVisible } from './digits';
import { ensureDefaultPool, getPoolWithSquares } from './pools';
import type { DbClient, DigitMapRow } from './types';

type PublicDigitMap = {
  winning_digits: number[] | null;
  losing_digits: number[] | null;
  revealed_at: Date | null;
  locked_at: Date | null;
};

export async function getPublicPoolData(db: DbClient) {
  const poolId = await ensureDefaultPool(db);
  const poolWithSquares = await getPoolWithSquares(db, poolId);
  const digitMap = await getDigitMap(db, poolId);
  const publicDigitMap = buildPublicDigitMap(digitMap);

  return {
    ...poolWithSquares,
    digit_map: publicDigitMap
  };
}

function buildPublicDigitMap(digitMap: DigitMapRow | null): PublicDigitMap | null {
  if (!digitMap) return null;
  const visible = isDigitsVisible(digitMap);
  return {
    winning_digits: visible ? digitMap.winning_digits : null,
    losing_digits: visible ? digitMap.losing_digits : null,
    revealed_at: digitMap.revealed_at,
    locked_at: digitMap.locked_at
  };
}
