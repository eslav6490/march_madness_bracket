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

describe('public analytics page', () => {
  let db: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    db = await createTestDb();
  });

  afterEach(async () => {
    await db.end();
    vi.resetModules();
    vi.clearAllMocks();
  });

  async function lockPool(poolId: string) {
    await db.query("update pools set status = 'locked' where id = $1", [poolId]);
  }

  it('server-renders heatmap + leaderboard using finalized results', async () => {
    const poolId = await createPoolWithSquares(db, 'Analytics UI Pool');

    // Identity permutations: digit N => row/col N.
    await upsertDigitMap(db, poolId, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    await revealDigitMap(db, poolId);
    await lockPool(poolId);

    const bob = await createParticipant(db, poolId, 'Bob');
    await assignSquare(db, poolId, 2, 2, bob.id);

    const game = await createGame(db, poolId, {
      round_key: 'round_of_32',
      team_a: 'Team A',
      team_b: 'Team B',
      status: 'final',
      score_a: 22,
      score_b: 2,
      start_time: null
    });
    await finalizeGame(db, poolId, game.id);

    vi.doMock('@/lib/db', () => ({ getDb: () => db }));
    const { default: Page } = await import('../app/pool/[poolId]/analytics/page');

    const jsx = await Page({ params: { poolId } });
    const html = renderToStaticMarkup(jsx as any);

    expect(html).toContain('Public Analytics');
    expect(html).toContain('Totals');
    expect(html).toContain('Heatmap');
    expect(html).toContain('Participant Leaderboard');
    expect(html).toContain('Bob');
    expect(html).toContain('role="columnheader"><strong>2</strong><span>Col 2</span>');
    expect(html).toContain('role="rowheader"><strong>2</strong><span>Row 2</span>');
  });

  it('shows hidden digit headers as ? until reveal/lock', async () => {
    const poolId = await createPoolWithSquares(db, 'Analytics Hidden Digits');
    await upsertDigitMap(db, poolId, [9, 8, 7, 6, 5, 4, 3, 2, 1, 0], [1, 0, 2, 3, 4, 5, 6, 7, 8, 9]);

    vi.doMock('@/lib/db', () => ({ getDb: () => db }));
    const { default: Page } = await import('../app/pool/[poolId]/analytics/page');

    const jsx = await Page({ params: { poolId } });
    const html = renderToStaticMarkup(jsx as any);

    expect(html).toContain('Digit headers are hidden until digits are revealed.');
    expect(html).toContain('role="columnheader"><strong>?</strong><span>Col 0</span>');
    expect(html).toContain('role="rowheader"><strong>?</strong><span>Row 0</span>');
  });

  it('shows placeholder digit header hint when no digit map exists', async () => {
    const poolId = await createPoolWithSquares(db, 'Analytics Missing Digits');

    vi.doMock('@/lib/db', () => ({ getDb: () => db }));
    const { default: Page } = await import('../app/pool/[poolId]/analytics/page');

    const jsx = await Page({ params: { poolId } });
    const html = renderToStaticMarkup(jsx as any);

    expect(html).toContain('Digit headers use ? until digits are randomized.');
    expect(html).toContain('role="columnheader"><strong>?</strong><span>Col 0</span>');
    expect(html).toContain('role="rowheader"><strong>?</strong><span>Row 0</span>');
  });
});
