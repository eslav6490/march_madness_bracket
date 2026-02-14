/// <reference types="vitest" />
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderToStaticMarkup } from 'react-dom/server';

import { createPoolWithSquares } from '@/lib/pools';
import { createTestDb } from './helpers/db';

describe('FEAT-015 public navigation', () => {
  let db: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    db = await createTestDb();
  });

  afterEach(async () => {
    await db.end();
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('renders shared public nav with active state and pool-aware links', async () => {
    const poolId = await createPoolWithSquares(db, 'Nav Pool');

    vi.doMock('@/lib/db', () => ({ getDb: () => db }));

    const { default: HomePage } = await import('../app/page');
    const { default: PayoutsPage } = await import('../app/payouts/page');
    const { default: ResultsPage } = await import('../app/pool/[poolId]/results/page');
    const { default: AnalyticsPage } = await import('../app/pool/[poolId]/analytics/page');

    const homeHtml = renderToStaticMarkup((await HomePage()) as any);
    expect(homeHtml).toContain('aria-current="page">Grid</a>');
    expect(homeHtml).toContain('href="/payouts"');
    expect(homeHtml).toContain(`href="/pool/${poolId}/results"`);
    expect(homeHtml).toContain(`href="/pool/${poolId}/analytics"`);

    const payoutsHtml = renderToStaticMarkup((await PayoutsPage()) as any);
    expect(payoutsHtml).toContain('aria-current="page">Payouts</a>');
    expect(payoutsHtml).toContain(`href="/pool/${poolId}/results"`);
    expect(payoutsHtml).toContain(`href="/pool/${poolId}/analytics"`);

    const resultsHtml = renderToStaticMarkup((await ResultsPage({ params: { poolId } })) as any);
    expect(resultsHtml).toContain('aria-current="page">Results</a>');
    expect(resultsHtml).toContain('href="/"');
    expect(resultsHtml).toContain('href="/payouts"');

    const analyticsHtml = renderToStaticMarkup((await AnalyticsPage({ params: { poolId } })) as any);
    expect(analyticsHtml).toContain('aria-current="page">Analytics</a>');
    expect(analyticsHtml).toContain(`href="/pool/${poolId}/results"`);
  });
});
