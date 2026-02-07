'use client';

import React, { useMemo, useState } from 'react';

import type { LeaderboardRow, SquareStatRow } from '@/lib/analytics';

type Props = {
  poolId: string;
  totals: { total_games_finalized: number; total_payout_cents: number };
  squares: SquareStatRow[];
  leaderboard: LeaderboardRow[];
};

type Metric = 'hits' | 'payout';

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
});

function formatMetric(metric: Metric, row: SquareStatRow) {
  if (metric === 'hits') return String(row.hit_count);
  return currency.format(row.total_payout_cents / 100);
}

export default function AnalyticsClient({ poolId, totals, squares, leaderboard }: Props) {
  const [metric, setMetric] = useState<Metric>('hits');

  const maxHits = useMemo(() => Math.max(0, ...squares.map((s) => s.hit_count)), [squares]);
  const maxPayout = useMemo(() => Math.max(0, ...squares.map((s) => s.total_payout_cents)), [squares]);

  const legend =
    metric === 'hits'
      ? 'Hits = number of finalized games where this square won.'
      : 'Payout = total payout earned by this square across finalized games.';

  const metricMax = metric === 'hits' ? maxHits : maxPayout;

  return (
    <>
      <section className="panel">
        <h2>Heatmap</h2>
        <p className="hint">Pool ID: {poolId}</p>
        <div className="form-row analytics-toggle">
          <button
            type="button"
            className={metric === 'hits' ? '' : 'button-secondary'}
            onClick={() => setMetric('hits')}
          >
            Hits
          </button>
          <button
            type="button"
            className={metric === 'payout' ? '' : 'button-secondary'}
            onClick={() => setMetric('payout')}
          >
            Payout
          </button>
          <span className="hint">{legend}</span>
        </div>

        <div className="heatmap-grid" role="grid" aria-label="Square heatmap">
          {squares.map((row) => {
            const value = metric === 'hits' ? row.hit_count : row.total_payout_cents;
            const ratio = metricMax > 0 ? Math.max(0, Math.min(1, value / metricMax)) : 0;
            const alpha = 0.08 + ratio * 0.42;
            const owner = row.owner_display_name ?? '';
            const titleParts = [
              `Row ${row.row_index}, Col ${row.col_index}`,
              `Owner: ${owner || 'Unowned'}`,
              `Hits: ${row.hit_count}`,
              `Payout: ${currency.format(row.total_payout_cents / 100)}`
            ];

            return (
              <div
                key={`${row.row_index}-${row.col_index}`}
                className="heatmap-cell"
                style={{ backgroundColor: `rgba(201, 106, 61, ${alpha})` }}
                title={titleParts.join('\n')}
                role="gridcell"
              >
                <strong>{formatMetric(metric, row)}</strong>
                <span className="heatmap-owner">{owner}</span>
              </div>
            );
          })}
        </div>

        {totals.total_games_finalized === 0 && <p className="hint">No finalized results yet.</p>}
      </section>

      <section className="panel">
        <h2>Participant Leaderboard</h2>
        <div className="table">
          <div className="table-row table-header">
            <span>Name</span>
            <span>Wins</span>
            <span>Total payout</span>
          </div>
          {leaderboard.map((row) => (
            <div className="table-row" key={row.participant_id}>
              <span>{row.display_name}</span>
              <span>{row.wins_count}</span>
              <span>{currency.format(row.total_payout_cents / 100)}</span>
            </div>
          ))}
          {leaderboard.length === 0 && <p className="hint">No participants yet.</p>}
        </div>
      </section>
    </>
  );
}
