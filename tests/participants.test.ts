/// <reference types="vitest" />
import { describe, expect, it } from 'vitest';

import { createParticipant, deleteParticipant, listParticipants, updateParticipant } from '@/lib/participants';
import { createPoolWithSquares, getPoolWithSquares } from '@/lib/pools';
import { assignSquare } from '@/lib/squares';
import { createTestDb } from './helpers/db';

describe('participants and assignments', () => {
  it('creates, updates, and deletes participants', async () => {
    const db = await createTestDb();
    const poolId = await createPoolWithSquares(db, 'Test Pool');
    const participant = await createParticipant(db, poolId, 'Alex', 'alex@example.com');

    const updated = await updateParticipant(db, participant.id, 'Alex Updated', 'new@example.com');
    expect(updated.display_name).toBe('Alex Updated');
    expect(updated.contact_info).toBe('new@example.com');

    const deleted = await deleteParticipant(db, participant.id, true);
    expect(deleted.deleted).toBe(true);

    await db.end();
  });

  it('tracks square counts and participant names', async () => {
    const db = await createTestDb();
    const poolId = await createPoolWithSquares(db, 'Test Pool');
    const participant = await createParticipant(db, poolId, 'Alex', 'alex@example.com');

    let participants = await listParticipants(db, poolId);
    expect(participants).toHaveLength(1);
    expect(participants[0].square_count).toBe(0);

    await assignSquare(db, poolId, 0, 0, participant.id);

    participants = await listParticipants(db, poolId);
    expect(participants[0].square_count).toBe(1);

    const pool = await getPoolWithSquares(db, poolId);
    const assigned = pool.squares.find((square) => square.row_index === 0 && square.col_index === 0);
    expect(assigned?.participant_name).toBe('Alex');

    await db.end();
  });

  it('allows multiple squares per participant', async () => {
    const db = await createTestDb();
    const poolId = await createPoolWithSquares(db, 'Test Pool');
    const participant = await createParticipant(db, poolId, 'Jordan');

    await assignSquare(db, poolId, 0, 0, participant.id);
    await assignSquare(db, poolId, 0, 1, participant.id);

    const participants = await listParticipants(db, poolId);
    expect(participants[0].square_count).toBe(2);

    await db.end();
  });

  it('ensures a square has only one owner at a time', async () => {
    const db = await createTestDb();
    const poolId = await createPoolWithSquares(db, 'Test Pool');
    const first = await createParticipant(db, poolId, 'Sam');
    const second = await createParticipant(db, poolId, 'Taylor');

    await assignSquare(db, poolId, 2, 2, first.id);
    await assignSquare(db, poolId, 2, 2, second.id);

    const pool = await getPoolWithSquares(db, poolId);
    const square = pool.squares.find((item) => item.row_index === 2 && item.col_index === 2);
    expect(square?.participant_id).toBe(second.id);

    const participants = await listParticipants(db, poolId);
    const firstCount = participants.find((item) => item.id === first.id)?.square_count ?? 0;
    const secondCount = participants.find((item) => item.id === second.id)?.square_count ?? 0;
    expect(firstCount).toBe(0);
    expect(secondCount).toBe(1);

    await db.end();
  });

  it('requires force to delete participants with squares', async () => {
    const db = await createTestDb();
    const poolId = await createPoolWithSquares(db, 'Test Pool');
    const participant = await createParticipant(db, poolId, 'Riley');

    await assignSquare(db, poolId, 1, 1, participant.id);

    const blocked = await deleteParticipant(db, participant.id, false);
    expect(blocked.deleted).toBe(false);
    expect(blocked.ownedSquares).toBe(1);

    const forced = await deleteParticipant(db, participant.id, true);
    expect(forced.deleted).toBe(true);

    const pool = await getPoolWithSquares(db, poolId);
    const cleared = pool.squares.find((square) => square.row_index === 1 && square.col_index === 1);
    expect(cleared?.participant_id).toBeNull();

    await db.end();
  });
});
