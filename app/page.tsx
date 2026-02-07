import { getDb } from '@/lib/db';
import { ensureDefaultPool, getPoolWithSquares, GRID_SIZE } from '@/lib/pools';

export default async function HomePage() {
  const db = getDb();
  const poolId = await ensureDefaultPool(db);
  const { pool, squares } = await getPoolWithSquares(db, poolId);

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
      </header>
      <section className="grid">
        {grid.map((row, rowIndex) =>
          row.map((square, colIndex) => (
            <div className="cell" key={`${rowIndex}-${colIndex}`}>
              <span>Row {rowIndex}, Col {colIndex}</span>
              <strong>{square?.participant_name ?? 'Unassigned'}</strong>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
