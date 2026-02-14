type ParticipantListRow = {
  id: string;
  display_name: string;
  square_count?: number;
};

export type ParticipantSortOption = 'name_asc' | 'name_desc' | 'squares_desc' | 'squares_asc';

type ParticipantViewOptions = {
  search: string;
  sort: ParticipantSortOption;
  onlyWithoutSquares: boolean;
};

function normalizeSquareCount(value: number | undefined) {
  return Number.isFinite(value) ? Number(value) : 0;
}

function compareNameAscending(a: ParticipantListRow, b: ParticipantListRow) {
  const byName = a.display_name.localeCompare(b.display_name, 'en', { sensitivity: 'base' });
  if (byName !== 0) return byName;
  return a.id.localeCompare(b.id);
}

export function deriveParticipantRows<T extends ParticipantListRow>(
  participants: T[],
  options: ParticipantViewOptions
): T[] {
  const searchNeedle = options.search.trim().toLowerCase();

  return participants
    .filter((participant) => {
      const squareCount = normalizeSquareCount(participant.square_count);
      if (options.onlyWithoutSquares && squareCount !== 0) return false;
      if (!searchNeedle) return true;
      return participant.display_name.toLowerCase().includes(searchNeedle);
    })
    .slice()
    .sort((a, b) => {
      if (options.sort === 'name_asc') {
        return compareNameAscending(a, b);
      }
      if (options.sort === 'name_desc') {
        return compareNameAscending(b, a);
      }
      const aCount = normalizeSquareCount(a.square_count);
      const bCount = normalizeSquareCount(b.square_count);
      const byCount = options.sort === 'squares_desc' ? bCount - aCount : aCount - bCount;
      if (byCount !== 0) return byCount;
      return compareNameAscending(a, b);
    });
}
