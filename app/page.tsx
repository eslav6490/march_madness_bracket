import React from 'react';

import { getDb } from '@/lib/db';
import { getDigitMap, isDigitsVisible } from '@/lib/digits';
import { ensureDefaultPool, getPoolWithSquares, GRID_SIZE } from '@/lib/pools';
import { PublicNav } from '@/components/public-nav';

export default async function HomePage() {
  const db = getDb();
  const poolId = await ensureDefaultPool(db);
  const { pool, squares } = await getPoolWithSquares(db, poolId);
  const digitMap = await getDigitMap(db, poolId);
  const showDigits = isDigitsVisible(digitMap);
  const winningDigits = showDigits ? digitMap?.winning_digits ?? [] : [];
  const losingDigits = showDigits ? digitMap?.losing_digits ?? [] : [];

  const grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
  for (const square of squares) {
    grid[square.row_index][square.col_index] = square;
  }

  return (
    <main>
      <header>
        <span className="badge">Public Grid</span>
        <h1>{pool.name}</h1>
        <p>Pool ID: {pool.id}</p>
        <PublicNav poolId={pool.id} activeKey="grid" />
      </header>
      <section className="grid grid--with-headers">
        <div className="cell cell--header"></div>
        {Array.from({ length: GRID_SIZE }).map((_, colIndex) => (
          <div className="cell cell--header" key={`col-${colIndex}`}>
            <strong>{showDigits ? losingDigits[colIndex] : '?'}</strong>
            <span>Col {colIndex}</span>
          </div>
        ))}
        {grid.map((row, rowIndex) => (
          <div className="grid-row" key={`row-${rowIndex}`}>
            <div className="cell cell--header">
              <strong>{showDigits ? winningDigits[rowIndex] : '?'}</strong>
              <span>Row {rowIndex}</span>
            </div>
            {row.map((square, colIndex) => (
              <div className="cell" key={`${rowIndex}-${colIndex}`}>
                <span>Row {rowIndex}, Col {colIndex}</span>
                <strong>{square?.participant_name ?? 'Unassigned'}</strong>
              </div>
            ))}
          </div>
        ))}
      </section>
    </main>
  );
}
