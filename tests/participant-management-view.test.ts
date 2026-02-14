/// <reference types="vitest" />
import { describe, expect, it } from 'vitest';

import { deriveParticipantRows } from '@/lib/participant-management-view';

const baseParticipants = [
  { id: 'a', display_name: 'Zoe', square_count: 2 },
  { id: 'b', display_name: 'alex', square_count: 0 },
  { id: 'c', display_name: 'Bob', square_count: 5 },
  { id: 'd', display_name: 'Avery', square_count: 0 }
];

describe('FEAT-020 participant management derived views', () => {
  it('filters by display name search case-insensitively', () => {
    const rows = deriveParticipantRows(baseParticipants, {
      search: 'av',
      sort: 'name_asc',
      onlyWithoutSquares: false
    });

    expect(rows.map((row) => row.display_name)).toEqual(['Avery']);
  });

  it('supports deterministic sort options for names and square counts', () => {
    const byNameAsc = deriveParticipantRows(baseParticipants, {
      search: '',
      sort: 'name_asc',
      onlyWithoutSquares: false
    });
    expect(byNameAsc.map((row) => row.display_name)).toEqual(['alex', 'Avery', 'Bob', 'Zoe']);

    const byNameDesc = deriveParticipantRows(baseParticipants, {
      search: '',
      sort: 'name_desc',
      onlyWithoutSquares: false
    });
    expect(byNameDesc.map((row) => row.display_name)).toEqual(['Zoe', 'Bob', 'Avery', 'alex']);

    const bySquaresDesc = deriveParticipantRows(baseParticipants, {
      search: '',
      sort: 'squares_desc',
      onlyWithoutSquares: false
    });
    expect(bySquaresDesc.map((row) => row.display_name)).toEqual(['Bob', 'Zoe', 'alex', 'Avery']);

    const bySquaresAsc = deriveParticipantRows(baseParticipants, {
      search: '',
      sort: 'squares_asc',
      onlyWithoutSquares: false
    });
    expect(bySquaresAsc.map((row) => row.display_name)).toEqual(['alex', 'Avery', 'Zoe', 'Bob']);
  });

  it('can show only participants with zero squares', () => {
    const rows = deriveParticipantRows(baseParticipants, {
      search: '',
      sort: 'name_asc',
      onlyWithoutSquares: true
    });

    expect(rows.map((row) => row.display_name)).toEqual(['alex', 'Avery']);
  });
});
