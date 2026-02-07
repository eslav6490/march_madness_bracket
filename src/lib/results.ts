import { randomUUID } from 'crypto';

import { getDigitMap, isDigitsVisible } from './digits';
import type { DbClient, DbPool, GameResultRow, GameRow } from './types';

export type PoolResultRow = GameResultRow & {
  round_key: string;
  team_a: string;
  team_b: string;
  score_a: number | null;
  score_b: number | null;
  status: string;
  winning_participant_name: string | null;
};

async function getExistingResult(db: DbClient, poolId: string, gameId: string): Promise<GameResultRow | null> {
  const existing = await db.query(
    `select id, pool_id, game_id, win_digit, lose_digit, winning_square_id, winning_participant_id,
            payout_amount_cents, finalized_at
       from game_results
      where pool_id = $1 and game_id = $2`,
    [poolId, gameId]
  );
  if (existing.rows.length === 0) return null;
  return mapGameResult(existing.rows[0]);
}

export async function finalizeGame(db: DbClient, poolId: string, gameId: string): Promise<GameResultRow> {
  const pool = db as DbPool;
  if (typeof pool.connect === 'function') {
    const client = await pool.connect();
    try {
      await client.query('begin');
      const result = await finalizeGameWithClient(client, poolId, gameId);
      await client.query('commit');
      return result;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release?.();
    }
  }

  await db.query('begin');
  try {
    const result = await finalizeGameWithClient(db, poolId, gameId);
    await db.query('commit');
    return result;
  } catch (error) {
    await db.query('rollback');
    throw error;
  }
}

async function finalizeGameWithClient(db: DbClient, poolId: string, gameId: string): Promise<GameResultRow> {
  const existing = await getExistingResult(db, poolId, gameId);
  if (existing) return existing;

  const poolRow = await db.query('select status from pools where id = $1', [poolId]);
  if (poolRow.rows.length === 0) {
    throw new Error('pool_not_found');
  }
  const status = String(poolRow.rows[0]?.status ?? '');
  if (status !== 'locked') {
    // Rule choice: require the pool to be locked before finalization.
    throw new Error('pool_not_locked');
  }

  const gameResult = await db.query(
    `select id, pool_id, round_key, team_a, team_b, score_a, score_b, status, start_time, external_id, updated_at
       from games
      where id = $1 and pool_id = $2`,
    [gameId, poolId]
  );
  if (gameResult.rows.length === 0) {
    throw new Error('game_not_found');
  }
  const game = mapGame(gameResult.rows[0]);

  if (game.status !== 'final') {
    throw new Error('game_not_final');
  }
  const scoreA = game.score_a;
  const scoreB = game.score_b;
  if (scoreA === null || scoreB === null) {
    throw new Error('scores_missing');
  }
  if (!Number.isInteger(scoreA) || !Number.isInteger(scoreB)) {
    throw new Error('scores_missing');
  }
  if (scoreA === scoreB) {
    throw new Error('tie_score');
  }

  const digitMap = await getDigitMap(db, poolId);
  if (!digitMap) {
    throw new Error('digit_map_missing');
  }
  if (!isDigitsVisible(digitMap)) {
    throw new Error('digits_not_visible');
  }

  const { winnerScore, loserScore } = scoreA > scoreB
    ? { winnerScore: scoreA, loserScore: scoreB }
    : { winnerScore: scoreB, loserScore: scoreA };

  const winDigit = winnerScore % 10;
  const loseDigit = loserScore % 10;

  const rowIndex = digitMap.winning_digits.indexOf(winDigit);
  const colIndex = digitMap.losing_digits.indexOf(loseDigit);
  if (rowIndex < 0 || colIndex < 0) {
    throw new Error('invalid_digit_map');
  }

  const squareResult = await db.query(
    `select id, participant_id
       from squares
      where pool_id = $1 and row_index = $2 and col_index = $3`,
    [poolId, rowIndex, colIndex]
  );
  if (squareResult.rows.length === 0) {
    throw new Error('square_not_found');
  }
  const winningSquareId = String(squareResult.rows[0].id);
  const winningParticipantId = squareResult.rows[0].participant_id ? String(squareResult.rows[0].participant_id) : null;

  const payoutResult = await db.query(
    `select amount_cents
       from payout_configs
      where pool_id = $1 and round_key = $2
      order by effective_at desc
      limit 1`,
    [poolId, game.round_key]
  );
  if (payoutResult.rows.length === 0) {
    throw new Error('payouts_missing');
  }
  const payoutAmountCents = Number(payoutResult.rows[0].amount_cents);

  const insert = await db.query(
    `insert into game_results
       (id, pool_id, game_id, win_digit, lose_digit, winning_square_id, winning_participant_id, payout_amount_cents)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     on conflict (pool_id, game_id) do nothing
     returning id, pool_id, game_id, win_digit, lose_digit, winning_square_id, winning_participant_id,
               payout_amount_cents, finalized_at`,
    [
      randomUUID(),
      poolId,
      gameId,
      winDigit,
      loseDigit,
      winningSquareId,
      winningParticipantId,
      payoutAmountCents
    ]
  );

  if (insert.rows.length > 0) {
    return mapGameResult(insert.rows[0]);
  }

  const afterConflict = await getExistingResult(db, poolId, gameId);
  if (!afterConflict) {
    throw new Error('finalize_failed');
  }
  return afterConflict;
}

export async function listPoolResults(db: DbClient, poolId: string): Promise<PoolResultRow[]> {
  const result = await db.query(
    `select gr.id, gr.pool_id, gr.game_id, gr.win_digit, gr.lose_digit, gr.winning_square_id, gr.winning_participant_id,
            gr.payout_amount_cents, gr.finalized_at,
            g.round_key, g.team_a, g.team_b, g.score_a, g.score_b, g.status,
            p.display_name as winning_participant_name
       from game_results gr
       join games g on g.id = gr.game_id
       left join participants p on p.id = gr.winning_participant_id
      where gr.pool_id = $1
      order by gr.finalized_at desc`,
    [poolId]
  );

  return result.rows.map((row) => ({
    ...mapGameResult(row),
    round_key: String(row.round_key),
    team_a: String(row.team_a),
    team_b: String(row.team_b),
    score_a: row.score_a === null ? null : Number(row.score_a),
    score_b: row.score_b === null ? null : Number(row.score_b),
    status: String(row.status),
    winning_participant_name: row.winning_participant_name ? String(row.winning_participant_name) : null
  }));
}

function mapGame(row: any): GameRow {
  return {
    id: String(row.id),
    pool_id: String(row.pool_id),
    round_key: String(row.round_key),
    team_a: String(row.team_a),
    team_b: String(row.team_b),
    score_a: row.score_a === null ? null : Number(row.score_a),
    score_b: row.score_b === null ? null : Number(row.score_b),
    status: String(row.status),
    start_time: row.start_time ? new Date(row.start_time) : null,
    external_id: row.external_id ? String(row.external_id) : null,
    updated_at: row.updated_at ? new Date(row.updated_at) : new Date(0)
  };
}

function mapGameResult(row: any): GameResultRow {
  return {
    id: String(row.id),
    pool_id: String(row.pool_id),
    game_id: String(row.game_id),
    win_digit: Number(row.win_digit),
    lose_digit: Number(row.lose_digit),
    winning_square_id: String(row.winning_square_id),
    winning_participant_id: row.winning_participant_id ? String(row.winning_participant_id) : null,
    payout_amount_cents: Number(row.payout_amount_cents),
    finalized_at: row.finalized_at ? new Date(row.finalized_at) : new Date(0)
  };
}
