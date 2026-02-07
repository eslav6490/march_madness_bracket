/// <reference types="vitest" />
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderToStaticMarkup } from 'react-dom/server';

import { createPoolWithSquares } from '@/lib/pools';
import { createParticipant } from '@/lib/participants';
import { assignSquare } from '@/lib/squares';
import { createGame } from '@/lib/games';
import { revealDigitMap, upsertDigitMap } from '@/lib/digits';
import { finalizeGame } from '@/lib/results';
import { createTestDb } from './helpers/db';

const ADMIN_TOKEN = 'test-admin';

async function lockPool(db: Awaited<ReturnType<typeof createTestDb>>, poolId: string) {
  await db.query("update pools set status = 'locked' where id = $1", [poolId]);
}

describe('public results page', () => {
  let db: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    db = await createTestDb();
    process.env.ADMIN_TOKEN = ADMIN_TOKEN;
  });

  afterEach(async () => {
    await db.end();
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('server-renders grouped results with totals', async () => {
    const poolId = await createPoolWithSquares(db, 'UI Pool');

    await upsertDigitMap(db, poolId, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    await revealDigitMap(db, poolId);
    await lockPool(db, poolId);

    const participant = await createParticipant(db, poolId, 'UI Winner');
    await assignSquare(db, poolId, 1, 1, participant.id);

    const game = await createGame(db, poolId, {
      round_key: 'round_of_64',
      team_a: 'Team A',
      team_b: 'Team B',
      status: 'final',
      score_a: 11,
      score_b: 1,
      start_time: null
    });

    await finalizeGame(db, poolId, game.id);

    vi.doMock('@/lib/db', () => ({ getDb: () => db }));
    const { default: Page } = await import('../app/pool/[poolId]/results/page');

    const jsx = await Page({ params: { poolId } });
    const html = renderToStaticMarkup(jsx as any);

    expect(html).toContain('Public Results');
    expect(html).toContain('Finalized games');
    expect(html).toContain('Round of 64');
    expect(html).toContain('Team A vs Team B');
    expect(html).toContain('UI Winner');
    expect(html).toContain('Digits: 1/1');
  });
});

