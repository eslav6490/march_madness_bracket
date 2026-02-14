import React from 'react';

import { getDb } from '@/lib/db';
import { getLatestPayouts, ROUND_KEYS, ROUND_LABELS } from '@/lib/payouts';
import { ensureDefaultPool } from '@/lib/pools';
import { PublicNav } from '@/components/public-nav';

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
});

export default async function PayoutsPage() {
  const db = getDb();
  const poolId = await ensureDefaultPool(db);
  const data = await getLatestPayouts(db, poolId);

  return (
    <main>
      <header>
        <span className="badge">Public Payouts</span>
        <h1>Payouts</h1>
        <p>Pool ID: {poolId}</p>
        <p>Last updated: {data.last_updated ? data.last_updated.toISOString() : 'n/a'}</p>
        <PublicNav poolId={poolId} activeKey="payouts" />
      </header>
      <section className="panel">
        <div className="table">
          <div className="table-row table-header">
            <span>Round</span>
            <span>Payout</span>
            <span></span>
          </div>
          {ROUND_KEYS.map((roundKey) => (
            <div className="table-row" key={roundKey}>
              <span>{ROUND_LABELS[roundKey]}</span>
              <span>{currency.format(data.payouts[roundKey] / 100)}</span>
              <span></span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
