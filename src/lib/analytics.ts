import type { DbClient } from './types';

export type AnalyticsTotals = {
  total_games_finalized: number;
  total_payout_cents: number;
};

export type SquareStatRow = {
  row_index: number;
  col_index: number;
  hit_count: number;
  total_payout_cents: number;
  owner_display_name: string | null;
};

export type SquareStatsResponse = {
  totals: AnalyticsTotals;
  squares: SquareStatRow[];
};

export type LeaderboardRow = {
  participant_id: string;
  display_name: string;
  wins_count: number;
  total_payout_cents: number;
};

export type ParticipantLeaderboardResponse = {
  totals: AnalyticsTotals & { total_participants: number };
  leaderboard: LeaderboardRow[];
};

async function requirePool(db: DbClient, poolId: string) {
  const exists = await db.query('select 1 from pools where id = $1', [poolId]);
  if (exists.rows.length === 0) {
    throw new Error('pool_not_found');
  }
}

async function getTotals(db: DbClient, poolId: string): Promise<AnalyticsTotals> {
  const totals = await db.query(
    `select
        count(*)::int as total_games_finalized,
        coalesce(sum(payout_amount_cents), 0)::int as total_payout_cents
       from game_results
      where pool_id = $1`,
    [poolId]
  );

  return {
    total_games_finalized: Number(totals.rows[0]?.total_games_finalized ?? 0),
    total_payout_cents: Number(totals.rows[0]?.total_payout_cents ?? 0)
  };
}

export async function getSquareStats(db: DbClient, poolId: string): Promise<SquareStatsResponse> {
  await requirePool(db, poolId);

  const totals = await getTotals(db, poolId);

  const result = await db.query(
    `select
        s.row_index,
        s.col_index,
        coalesce(gr.hit_count, 0)::int as hit_count,
        coalesce(gr.total_payout_cents, 0)::int as total_payout_cents,
        p.display_name as owner_display_name
       from squares s
       left join participants p on p.id = s.participant_id
       left join (
         select winning_square_id,
                count(*)::int as hit_count,
                coalesce(sum(payout_amount_cents), 0)::int as total_payout_cents
           from game_results
          where pool_id = $1
          group by winning_square_id
       ) gr on gr.winning_square_id = s.id
      where s.pool_id = $1
      order by s.row_index asc, s.col_index asc`,
    [poolId]
  );

  return {
    totals,
    squares: result.rows.map((row) => ({
      row_index: Number(row.row_index),
      col_index: Number(row.col_index),
      hit_count: Number(row.hit_count ?? 0),
      total_payout_cents: Number(row.total_payout_cents ?? 0),
      owner_display_name: row.owner_display_name ? String(row.owner_display_name) : null
    }))
  };
}

export async function getParticipantLeaderboard(
  db: DbClient,
  poolId: string
): Promise<ParticipantLeaderboardResponse> {
  await requirePool(db, poolId);

  const totals = await getTotals(db, poolId);
  const participantsCount = await db.query('select count(*)::int as count from participants where pool_id = $1', [
    poolId
  ]);
  const totalParticipants = Number(participantsCount.rows[0]?.count ?? 0);

  const result = await db.query(
    `select
        p.id as participant_id,
        p.display_name,
        coalesce(count(gr.id), 0)::int as wins_count,
        coalesce(sum(gr.payout_amount_cents), 0)::int as total_payout_cents
       from participants p
       left join game_results gr
         on gr.pool_id = p.pool_id
        and gr.winning_participant_id = p.id
      where p.pool_id = $1
      group by p.id, p.display_name
      order by total_payout_cents desc, wins_count desc, p.display_name asc`,
    [poolId]
  );

  return {
    totals: { ...totals, total_participants: totalParticipants },
    leaderboard: result.rows.map((row) => ({
      participant_id: String(row.participant_id),
      display_name: String(row.display_name),
      wins_count: Number(row.wins_count ?? 0),
      total_payout_cents: Number(row.total_payout_cents ?? 0)
    }))
  };
}
