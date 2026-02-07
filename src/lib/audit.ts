import { randomUUID } from 'crypto';

import type { AuditEventRow, DbClient } from './types';

export type AuditAction =
  | 'pool_lock'
  | 'digits_randomize'
  | 'digits_reveal'
  | 'square_assign'
  | 'payouts_update'
  | 'game_create'
  | 'game_update'
  | 'game_delete'
  | 'game_finalize'
  | 'participant_create'
  | 'participant_update'
  | 'participant_delete';

export type AuditEntityType =
  | 'pool'
  | 'digit_map'
  | 'square'
  | 'payout_config'
  | 'game'
  | 'game_result'
  | 'participant';

export type AuditEventInput = {
  pool_id?: string | null;
  actor: string;
  action: AuditAction | string;
  entity_type?: AuditEntityType | string | null;
  entity_id?: string | null;
  metadata?: Record<string, unknown>;
};

export type ListAuditEventsOptions = {
  limit?: number;
  before?: Date | null;
  before_id?: string | null;
};

export async function logAuditEvent(db: DbClient, input: AuditEventInput): Promise<void> {
  try {
    await db.query(
      `insert into audit_events (id, pool_id, actor, action, entity_type, entity_id, metadata)
       values ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [
        randomUUID(),
        input.pool_id ?? null,
        input.actor,
        input.action,
        input.entity_type ?? null,
        input.entity_id ?? null,
        JSON.stringify(input.metadata ?? {})
      ]
    );
  } catch (error) {
    // Best-effort only; never break the main admin action.
    console.error('audit_log_failed', error);
  }
}

export async function listAuditEvents(
  db: DbClient,
  poolId: string,
  options: ListAuditEventsOptions = {}
): Promise<AuditEventRow[]> {
  const limit = clampLimit(options.limit ?? 50);

  const before = options.before ?? null;
  const beforeId = options.before_id ?? null;

  const params: unknown[] = [poolId];
  let where = 'where pool_id = $1';

  if (before && beforeId) {
    params.push(before, beforeId);
    where += ` and (created_at < $2 or (created_at = $2 and id < $3))`;
  } else if (before) {
    params.push(before);
    where += ` and created_at < $2`;
  }

  params.push(limit);
  const limitParam = params.length;

  const result = await db.query(
    `select id, pool_id, actor, action, entity_type, entity_id, metadata, created_at
       from audit_events
       ${where}
      order by created_at desc, id desc
      limit $${limitParam}`,
    params
  );

  return result.rows.map(mapAuditEventRow);
}

function clampLimit(value: number): number {
  if (!Number.isFinite(value) || !Number.isInteger(value)) return 50;
  if (value < 1) return 1;
  if (value > 200) return 200;
  return value;
}

function mapAuditEventRow(row: any): AuditEventRow {
  return {
    id: String(row.id),
    pool_id: row.pool_id ? String(row.pool_id) : null,
    actor: String(row.actor),
    action: String(row.action),
    entity_type: row.entity_type ? String(row.entity_type) : null,
    entity_id: row.entity_id ? String(row.entity_id) : null,
    metadata: row.metadata ?? {},
    created_at: row.created_at ? new Date(row.created_at) : new Date(0)
  };
}

