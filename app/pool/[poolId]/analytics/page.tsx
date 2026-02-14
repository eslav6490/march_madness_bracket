import React from 'react';

import { getDb } from '@/lib/db';
import { getParticipantLeaderboard, getSquareStats } from '@/lib/analytics';
import { PublicNav } from '@/components/public-nav';

import AnalyticsClient from './analytics-client';

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
});

export default async function PoolAnalyticsPage({ params }: { params: { poolId: string } }) {
  const db = getDb();
  try {
    const [squaresData, participantsData] = await Promise.all([
      getSquareStats(db, params.poolId),
      getParticipantLeaderboard(db, params.poolId)
    ]);

    return (
      <main>
        <header>
          <span className="badge">Public Analytics</span>
          <h1>Analytics</h1>
          <p>Pool ID: {params.poolId}</p>
          <PublicNav poolId={params.poolId} activeKey="analytics" />
        </header>

        <section className="panel">
          <h2>Totals</h2>
          <div className="table">
            <div className="table-row table-header">
              <span>Finalized games</span>
              <span>Total payout</span>
              <span></span>
            </div>
            <div className="table-row">
              <span>{squaresData.totals.total_games_finalized}</span>
              <span>{currency.format(squaresData.totals.total_payout_cents / 100)}</span>
              <span></span>
            </div>
          </div>
        </section>

        <AnalyticsClient
          poolId={params.poolId}
          totals={squaresData.totals}
          squares={squaresData.squares}
          leaderboard={participantsData.leaderboard}
        />
      </main>
    );
  } catch (error) {
    const message = (error as Error).message;
    return (
      <main>
        <header>
          <span className="badge">Public Analytics</span>
          <h1>Analytics</h1>
          <p>Pool ID: {params.poolId}</p>
          <PublicNav poolId={params.poolId} activeKey="analytics" />
        </header>
        <section className="panel">
          <p>{message === 'pool_not_found' ? 'Pool not found.' : 'Failed to load analytics.'}</p>
        </section>
      </main>
    );
  }
}
