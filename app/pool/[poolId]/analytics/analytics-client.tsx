'use client';

import React, { useMemo, useState } from 'react';

import type { LeaderboardRow, SquareStatRow } from '@/lib/analytics';

type Props = {
  poolId: string;
  totals: { total_games_finalized: number; total_payout_cents: number };
  squares: SquareStatRow[];
  leaderboard: LeaderboardRow[];
  hasDigitMap: boolean;
  showDigitHeaders: boolean;
  winningDigits: number[];
  losingDigits: number[];
};

type Metric = 'hits' | 'payout';

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
});

export default function AnalyticsClient({
  poolId,
  totals,
  squares,
  leaderboard,
  hasDigitMap,
  showDigitHeaders,
  winningDigits,
  losingDigits
}: Props) {
  const [metric, setMetric] = useState<Metric>('hits');

  const maxHits = useMemo(() => Math.max(0, ...squares.map((s) => s.hit_count)), [squares]);
  const maxPayout = useMemo(() => Math.max(0, ...squares.map((s) => s.total_payout_cents)), [squares]);

  const legend =
    metric === 'hits'
      ? 'Hits = number of finalized games where this square won.'
      : 'Payout = total payout earned by this square across finalized games.';

  const metricMax = metric === 'hits' ? maxHits : maxPayout;
  const squaresByCell = useMemo(() => {
    return new Map(squares.map((row) => [`${row.row_index}-${row.col_index}`, row]));
  }, [squares]);

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

        {!showDigitHeaders && (
          <p className="hint">
            {hasDigitMap
              ? 'Digit headers are hidden until digits are revealed.'
              : 'Digit headers use ? until digits are randomized.'}
          </p>
        )}
        <div className="scroll-x">
          <div className="heatmap-grid heatmap-grid--with-headers" role="grid" aria-label="Square heatmap">
            <div className="heatmap-header-cell heatmap-header-cell--corner" role="columnheader" />
            {Array.from({ length: 10 }).map((_, colIndex) => (
              <div className="heatmap-header-cell" key={`heatmap-col-${colIndex}`} role="columnheader">
                <strong>{showDigitHeaders ? losingDigits[colIndex] : '?'}</strong>
                <span>Col {colIndex}</span>
              </div>
            ))}
            {Array.from({ length: 10 }).map((_, rowIndex) => (
              <div className="heatmap-grid-row" key={`heatmap-row-${rowIndex}`}>
                <div className="heatmap-header-cell" role="rowheader">
                  <strong>{showDigitHeaders ? winningDigits[rowIndex] : '?'}</strong>
                  <span>Row {rowIndex}</span>
                </div>
                {Array.from({ length: 10 }).map((__, colIndex) => {
                  const row = squaresByCell.get(`${rowIndex}-${colIndex}`);
                  const value = metric === 'hits' ? row?.hit_count ?? 0 : row?.total_payout_cents ?? 0;
                  const ratio = metricMax > 0 ? Math.max(0, Math.min(1, value / metricMax)) : 0;
                  const alpha = 0.08 + ratio * 0.42;
                  const owner = row?.owner_display_name ?? '';
                  const hitCount = row?.hit_count ?? 0;
                  const payout = row?.total_payout_cents ?? 0;
                  const metricValue = metric === 'hits' ? String(hitCount) : currency.format(payout / 100);
                  const titleParts = [
                    `Row ${rowIndex}, Col ${colIndex}`,
                    `Owner: ${owner || 'Unowned'}`,
                    `Hits: ${hitCount}`,
                    `Payout: ${currency.format(payout / 100)}`
                  ];

                  return (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className="heatmap-cell"
                      style={{ backgroundColor: `rgba(201, 106, 61, ${alpha})` }}
                      title={titleParts.join('\n')}
                      role="gridcell"
                    >
                      <strong>{metricValue}</strong>
                      <span className="heatmap-owner">{owner}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
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
