import React from 'react';

import { GAME_ROUND_KEYS, GAME_ROUND_LABELS, type GameRoundKey } from '@/lib/games';
import type { PoolResultRow } from '@/lib/results';

import { GET as getResults } from '../../../api/pool/[poolId]/results/route';

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
});

function groupByRound(results: PoolResultRow[]) {
  const map = new Map<GameRoundKey, PoolResultRow[]>();
  for (const result of results) {
    const key = result.round_key as GameRoundKey;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(result);
  }
  return map;
}

export default async function PoolResultsPage({ params }: { params: { poolId: string } }) {
  const response = await getResults(new Request('http://localhost'), { params: { poolId: params.poolId } });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = (body as any)?.error ?? 'Failed to load results.';
    return (
      <main>
        <header>
          <span className="badge">Public Results</span>
          <h1>Results</h1>
          <p>Pool ID: {params.poolId}</p>
        </header>
        <section className="panel">
          <p>{message}</p>
        </section>
      </main>
    );
  }

  const body = (await response.json()) as { results: PoolResultRow[] };
  const results = body.results ?? [];

  const finalizedCount = results.length;
  const totalPayoutCents = results.reduce((sum, row) => sum + Number(row.payout_amount_cents ?? 0), 0);
  const grouped = groupByRound(results);

  return (
    <main>
      <header>
        <span className="badge">Public Results</span>
        <h1>Results</h1>
        <p>Pool ID: {params.poolId}</p>
      </header>

      <section className="panel">
        <div className="table">
          <div className="table-row table-header">
            <span>Finalized games</span>
            <span>Total payout</span>
            <span></span>
          </div>
          <div className="table-row">
            <span>{finalizedCount}</span>
            <span>{currency.format(totalPayoutCents / 100)}</span>
            <span></span>
          </div>
        </div>
      </section>

      {finalizedCount === 0 ? (
        <section className="panel">
          <p>No finalized results yet.</p>
        </section>
      ) : (
        GAME_ROUND_KEYS.filter((key) => grouped.has(key)).map((roundKey) => {
          const rows = grouped.get(roundKey) ?? [];
          return (
            <section className="panel" key={roundKey}>
              <h2>{GAME_ROUND_LABELS[roundKey]}</h2>
              <div className="table">
                <div className="table-row table-header">
                  <span>Game</span>
                  <span>Winner</span>
                  <span>Digits / Payout</span>
                </div>
                {rows.map((row) => {
                  const score =
                    Number.isInteger(row.score_a) && Number.isInteger(row.score_b)
                      ? `${row.score_a}-${row.score_b}`
                      : 'n/a';

                  const winnerName = row.winning_participant_name ?? 'Unowned';
                  const digits = `${row.win_digit}/${row.lose_digit}`;
                  const payout = currency.format(row.payout_amount_cents / 100);

                  return (
                    <div className="table-row" key={row.id}>
                      <span>
                        <strong>
                          {row.team_a} vs {row.team_b}
                        </strong>
                        <div className="hint">Score: {score} | Status: {row.status}</div>
                      </span>
                      <span>{winnerName}</span>
                      <span className="stack">
                        <span>Digits: {digits}</span>
                        <span>Payout: {payout}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
    </main>
  );
}
