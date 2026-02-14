'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { AdminLogoutButton } from '@/components/admin-logout-button';
import { useAdminSessionGuard } from '@/components/use-admin-session-guard';
import { deriveParticipantRows, type ParticipantSortOption } from '@/lib/participant-management-view';

type Pool = {
  id: string;
  name: string;
  status: string;
};

type Square = {
  id: string;
  row_index: number;
  col_index: number;
  participant_id: string | null;
  participant_name: string | null;
};

type Participant = {
  id: string;
  display_name: string;
  contact_info: string | null;
  square_count?: number;
};

type DigitMap = {
  winning_digits: number[];
  losing_digits: number[];
  revealed_at: string | null;
  locked_at: string | null;
};

const GRID_SIZE = 10;
const JSON_HEADERS = { 'Content-Type': 'application/json' };

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? fallback;
  } catch {
    return fallback;
  }
}

function getStatusDescription(status: string) {
  if (status === 'draft') {
    return 'Draft: configure participants, squares, and digits before locking.';
  }
  if (status === 'open') {
    return 'Open: setup is still editable and lock prerequisites can be completed.';
  }
  if (status === 'locked') {
    return 'Locked: participant, square, game, and payout edits are blocked.';
  }
  if (status === 'completed') {
    return 'Completed: tournament processing is complete and data is historical.';
  }
  return 'Status unavailable.';
}

export default function AdminPage() {
  const sessionReady = useAdminSessionGuard();
  const [pool, setPool] = useState<Pool | null>(null);
  const [squares, setSquares] = useState<Square[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [assignParticipantId, setAssignParticipantId] = useState<string>('');
  const [newParticipantName, setNewParticipantName] = useState('');
  const [newParticipantContact, setNewParticipantContact] = useState('');
  const [message, setMessage] = useState<string>('');
  const [digitMap, setDigitMap] = useState<DigitMap | null>(null);
  const [participantSearch, setParticipantSearch] = useState('');
  const [participantSort, setParticipantSort] = useState<ParticipantSortOption>('name_asc');
  const [showOnlyParticipantsWithNoSquares, setShowOnlyParticipantsWithNoSquares] = useState(false);
  const [showOnlyUnassignedSquares, setShowOnlyUnassignedSquares] = useState(false);

  const [isLoadingPool, setIsLoadingPool] = useState(false);
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(false);
  const [isLoadingDigitMap, setIsLoadingDigitMap] = useState(false);

  const [isCreatingParticipant, setIsCreatingParticipant] = useState(false);
  const [busyParticipantId, setBusyParticipantId] = useState<string | null>(null);
  const [busyParticipantAction, setBusyParticipantAction] = useState<'edit' | 'delete' | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [digitActionLoading, setDigitActionLoading] = useState<'randomize' | 'reveal' | 'lock' | null>(null);

  const loadPool = useCallback(async () => {
    setIsLoadingPool(true);
    try {
      const res = await fetch('/api/pool', { cache: 'no-store' });
      if (!res.ok) {
        setMessage(await readErrorMessage(res, 'Failed to load pool'));
        return;
      }
      const data = await res.json();
      setPool(data.pool ?? null);
      setSquares(data.squares ?? []);
    } finally {
      setIsLoadingPool(false);
    }
  }, []);

  const loadParticipants = useCallback(
    async (poolId: string) => {
      setIsLoadingParticipants(true);
      try {
        const res = await fetch(`/api/admin/pools/${poolId}/participants`, {
          cache: 'no-store'
        });
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            window.location.href = '/admin/login';
            return;
          }
          setMessage(await readErrorMessage(res, 'Failed to load participants'));
          return;
        }
        const data = await res.json();
        setParticipants(data.participants ?? []);
      } finally {
        setIsLoadingParticipants(false);
      }
    },
    []
  );

  const loadDigitMap = useCallback(
    async (poolId: string) => {
      setIsLoadingDigitMap(true);
      try {
        const res = await fetch(`/api/admin/pool/${poolId}/digits`, {
          cache: 'no-store'
        });
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            window.location.href = '/admin/login';
            return;
          }
          setMessage(await readErrorMessage(res, 'Failed to load digit map'));
          return;
        }
        const data = await res.json();
        setDigitMap(data.digit_map ?? null);
      } finally {
        setIsLoadingDigitMap(false);
      }
    },
    []
  );

  const loadAll = useCallback(async () => {
    setMessage('');
    await loadPool();
  }, [loadPool]);

  useEffect(() => {
    if (!sessionReady) return;
    loadAll();
  }, [loadAll, sessionReady]);

  useEffect(() => {
    if (pool && sessionReady) {
      loadParticipants(pool.id);
      loadDigitMap(pool.id);
    }
  }, [pool, sessionReady, loadParticipants, loadDigitMap]);

  useEffect(() => {
    if (!showOnlyUnassignedSquares) return;
    if (!selectedSquare?.participant_id) return;
    setSelectedSquare(null);
    setAssignParticipantId('');
  }, [showOnlyUnassignedSquares, selectedSquare]);

  const grid = useMemo(() => {
    const base = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null) as Array<Square | null>);
    for (const square of squares) {
      base[square.row_index][square.col_index] = square;
    }
    return base;
  }, [squares]);
  const visibleParticipants = useMemo(
    () =>
      deriveParticipantRows(participants, {
        search: participantSearch,
        sort: participantSort,
        onlyWithoutSquares: showOnlyParticipantsWithNoSquares
      }),
    [participants, participantSearch, participantSort, showOnlyParticipantsWithNoSquares]
  );

  const filledCount = squares.filter((square) => square.participant_id).length;
  const unassignedCount = squares.length - filledCount;
  const isLocked = pool?.status === 'locked';

  const randomizeDisabled = !pool || isLocked || digitActionLoading !== null;
  const revealDisabled = !pool || !digitMap || Boolean(digitMap.revealed_at) || isLocked || digitActionLoading !== null;
  const lockDisabled = !pool || isLocked || digitActionLoading !== null;

  const handleCreateParticipant = async () => {
    if (!pool || isLocked || isCreatingParticipant) return;
    if (!newParticipantName.trim()) {
      setMessage('Participant name is required.');
      return;
    }

    setIsCreatingParticipant(true);
    try {
      const res = await fetch(`/api/admin/pools/${pool.id}/participants`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({
          display_name: newParticipantName.trim(),
          contact_info: newParticipantContact.trim() || null
        })
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          window.location.href = '/admin/login';
          return;
        }
        setMessage(await readErrorMessage(res, 'Failed to create participant'));
        return;
      }

      const data = await res.json();
      setParticipants((prev) => [...prev, data.participant]);
      setNewParticipantName('');
      setNewParticipantContact('');
      setMessage('Participant created.');
    } finally {
      setIsCreatingParticipant(false);
    }
  };

  const handleEditParticipant = async (participant: Participant) => {
    if (isLocked || busyParticipantId) return;

    const displayName = window.prompt('Edit participant name', participant.display_name);
    if (!displayName) return;
    const contactInfo = window.prompt('Edit contact info (optional)', participant.contact_info ?? '') ?? '';

    setBusyParticipantId(participant.id);
    setBusyParticipantAction('edit');
    try {
      const res = await fetch(`/api/admin/participants/${participant.id}`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ display_name: displayName.trim(), contact_info: contactInfo.trim() || null })
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          window.location.href = '/admin/login';
          return;
        }
        setMessage(await readErrorMessage(res, 'Failed to update participant'));
        return;
      }

      const data = await res.json();
      setParticipants((prev) =>
        prev.map((item) => (item.id === participant.id ? { ...item, ...data.participant } : item))
      );
      setMessage('Participant updated.');
    } finally {
      setBusyParticipantId(null);
      setBusyParticipantAction(null);
    }
  };

  const handleDeleteParticipant = async (participant: Participant) => {
    if (isLocked || busyParticipantId) return;
    if (!window.confirm(`Delete ${participant.display_name}?`)) return;

    setBusyParticipantId(participant.id);
    setBusyParticipantAction('delete');
    try {
      let res = await fetch(`/api/admin/participants/${participant.id}`, {
        method: 'DELETE'
      });

      if (res.status === 409) {
        const data = await res.json();
        const confirmForce = window.confirm(
          `${participant.display_name} owns ${data.ownedSquares} squares. Remove and unassign all?`
        );
        if (!confirmForce) return;
        res = await fetch(`/api/admin/participants/${participant.id}?force=true`, {
          method: 'DELETE'
        });
      }

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          window.location.href = '/admin/login';
          return;
        }
        setMessage(await readErrorMessage(res, 'Failed to delete participant'));
        return;
      }

      setParticipants((prev) => prev.filter((item) => item.id !== participant.id));
      setSquares((prev) =>
        prev.map((square) =>
          square.participant_id === participant.id ? { ...square, participant_id: null, participant_name: null } : square
        )
      );
      setMessage('Participant deleted.');
    } finally {
      setBusyParticipantId(null);
      setBusyParticipantAction(null);
    }
  };

  const handleAssign = async () => {
    if (!pool || !selectedSquare || isLocked || isAssigning) return;
    setIsAssigning(true);
    try {
      const res = await fetch(`/api/admin/pools/${pool.id}/squares`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({
          row_index: selectedSquare.row_index,
          col_index: selectedSquare.col_index,
          participant_id: assignParticipantId || null
        })
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          window.location.href = '/admin/login';
          return;
        }
        setMessage(await readErrorMessage(res, 'Failed to assign square'));
        return;
      }

      const data = await res.json();
      const updatedSquare = data.square as Square;
      setSquares((prev) => prev.map((square) => (square.id === updatedSquare.id ? updatedSquare : square)));
      setSelectedSquare(updatedSquare);
      if (pool) {
        loadParticipants(pool.id);
      }
      setMessage('Square assignment saved.');
    } finally {
      setIsAssigning(false);
    }
  };

  const callDigitAction = async (action: 'randomize' | 'reveal' | 'lock') => {
    if (!pool || digitActionLoading) return;
    if (!window.confirm(`Confirm ${action}?`)) return;

    const endpoint =
      action === 'lock'
        ? `/api/admin/pool/${pool.id}/lock`
        : `/api/admin/pool/${pool.id}/digits/${action}`;

    setDigitActionLoading(action);
    try {
      const res = await fetch(endpoint, {
        method: 'POST'
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          window.location.href = '/admin/login';
          return;
        }
        setMessage(await readErrorMessage(res, `Failed to ${action} digits`));
        return;
      }

      const data = await res.json();
      setDigitMap(data.digit_map ?? data);
      if (action === 'lock') {
        setPool((prev) => (prev ? { ...prev, status: 'locked' } : prev));
      }
      setMessage(`${action} complete.`);
    } finally {
      setDigitActionLoading(null);
    }
  };

  if (!sessionReady) {
    return (
      <main>
        <section className="panel">
          <p>Checking admin session...</p>
        </section>
      </main>
    );
  }

  return (
    <main>
      <header>
        <span className="badge">Admin</span>
        <h1>Pool Admin</h1>
        <p>Manage participants and assign squares.</p>
        <div className="form-row">
          <a className="button-link button-secondary" href="/admin/login">
            Switch Account
          </a>
          <AdminLogoutButton className="button-secondary" />
        </div>
      </header>

      {message && <div className="message">{message}</div>}

      <section className="panel">
        <h2>Pool Status</h2>
        {isLoadingPool ? (
          <div className="skeleton-block" aria-label="Loading pool status" />
        ) : pool ? (
          <>
            <div className={`status-pill status-pill--${pool.status}`}>
              Status: {pool.status}
            </div>
            <p>{getStatusDescription(pool.status)}</p>
            <p>
              <strong>Locked at:</strong> {digitMap?.locked_at ?? 'not yet'}
            </p>
          </>
        ) : (
          <p className="hint">Pool status unavailable.</p>
        )}
      </section>

      <section className="panel">
        <h2>Participants</h2>
        {isLocked && <p className="hint">Pool is locked; participants cannot be changed.</p>}
        <div className="form-row">
          <input
            type="text"
            placeholder="Display name"
            value={newParticipantName}
            onChange={(event) => setNewParticipantName(event.target.value)}
            disabled={isLocked || isCreatingParticipant}
          />
          <input
            type="text"
            placeholder="Contact info (optional)"
            value={newParticipantContact}
            onChange={(event) => setNewParticipantContact(event.target.value)}
            disabled={isLocked || isCreatingParticipant}
          />
          <button type="button" onClick={handleCreateParticipant} disabled={isLocked || isCreatingParticipant}>
            {isCreatingParticipant ? 'Adding...' : 'Add'}
          </button>
        </div>
        <div className="form-row participant-controls">
          <input
            type="text"
            placeholder="Search participants"
            value={participantSearch}
            onChange={(event) => setParticipantSearch(event.target.value)}
          />
          <select
            value={participantSort}
            onChange={(event) => setParticipantSort(event.target.value as ParticipantSortOption)}
          >
            <option value="name_asc">Name A→Z</option>
            <option value="name_desc">Name Z→A</option>
            <option value="squares_desc">Squares descending</option>
            <option value="squares_asc">Squares ascending</option>
          </select>
          <label className="checkbox-control">
            <input
              type="checkbox"
              checked={showOnlyParticipantsWithNoSquares}
              onChange={(event) => setShowOnlyParticipantsWithNoSquares(event.target.checked)}
            />
            Show only participants with 0 squares
          </label>
        </div>
        <p className="hint">
          {visibleParticipants.length} of {participants.length} participants shown
        </p>

        {isLoadingParticipants ? (
          <div className="table" aria-label="Loading participants">
            <div className="table-row table-header">
              <span>Name</span>
              <span>Squares</span>
              <span>Actions</span>
            </div>
            {Array.from({ length: 3 }).map((_, idx) => (
              <div className="table-row" key={`participant-skeleton-${idx}`}>
                <span className="skeleton-line" />
                <span className="skeleton-line" />
                <span className="skeleton-line" />
              </div>
            ))}
          </div>
        ) : (
          <div className="table">
            <div className="table-row table-header">
              <span>Name</span>
              <span>Squares</span>
              <span>Actions</span>
            </div>
            {visibleParticipants.map((participant) => (
              <div className="table-row" key={participant.id}>
                <span>{participant.display_name}</span>
                <span>{participant.square_count ?? 0}</span>
                <span className="actions">
                  <button
                    type="button"
                    onClick={() => handleEditParticipant(participant)}
                    disabled={isLocked || Boolean(busyParticipantId)}
                  >
                    {busyParticipantId === participant.id && busyParticipantAction === 'edit' ? 'Editing...' : 'Edit'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteParticipant(participant)}
                    disabled={isLocked || Boolean(busyParticipantId)}
                  >
                    {busyParticipantId === participant.id && busyParticipantAction === 'delete' ? 'Deleting...' : 'Delete'}
                  </button>
                </span>
              </div>
            ))}
            {!isLoadingParticipants && visibleParticipants.length === 0 && (
              <p className="hint">
                {participants.length === 0 ? 'No participants yet.' : 'No participants match the current filters.'}
              </p>
            )}
          </div>
        )}
      </section>

      {pool && (
        <section className="panel">
          <h2>Pool Navigation</h2>
          <p className="hint">Jump to games, payouts, and audit tools for this pool.</p>
          <div className="form-row">
            <a className="button-link" href={`/admin/pool/${pool.id}/games`}>
              Games
            </a>
            <a className="button-link" href={`/admin/pool/${pool.id}/payouts`}>
              Payouts
            </a>
            <a className="button-link" href={`/admin/pool/${pool.id}/audit`}>
              Audit Log
            </a>
          </div>
        </section>
      )}

      <section className="panel">
        <h2>Digit Map</h2>
        {isLocked && <p className="hint">Pool is locked; digit changes are disabled.</p>}
        {!digitMap && !isLoadingDigitMap && (
          <p className="hint">Reveal is unavailable until digits are randomized.</p>
        )}
        {digitMap?.revealed_at && !isLoadingDigitMap && <p className="hint">Digits are already revealed.</p>}
        <div className="form-row">
          <button
            type="button"
            onClick={() => callDigitAction('randomize')}
            disabled={randomizeDisabled}
          >
            {digitActionLoading === 'randomize' ? 'Randomizing...' : 'Randomize'}
          </button>
          <button
            type="button"
            onClick={() => callDigitAction('reveal')}
            disabled={revealDisabled}
          >
            {digitActionLoading === 'reveal' ? 'Revealing...' : 'Reveal'}
          </button>
          <button
            type="button"
            onClick={() => callDigitAction('lock')}
            disabled={lockDisabled}
          >
            {digitActionLoading === 'lock' ? 'Locking...' : 'Lock'}
          </button>
        </div>
        {isLoadingDigitMap ? (
          <div className="stack" aria-label="Loading digit map">
            <span className="skeleton-line" />
            <span className="skeleton-line" />
            <span className="skeleton-line" />
          </div>
        ) : digitMap ? (
          <div className="digit-map">
            <div>
              <strong>Winning digits:</strong> {digitMap.winning_digits.join(', ')}
            </div>
            <div>
              <strong>Losing digits:</strong> {digitMap.losing_digits.join(', ')}
            </div>
            <div className="hint">
              Revealed: {digitMap.revealed_at ?? 'not yet'} | Locked: {digitMap.locked_at ?? 'not yet'}
            </div>
          </div>
        ) : (
          <p className="hint">No digit map yet. Randomize to generate digits.</p>
        )}
      </section>

      <section className="panel">
        <h2>Grid</h2>
        {isLoadingPool ? (
          <div className="grid grid-skeleton" aria-label="Loading pool grid">
            {Array.from({ length: 20 }).map((_, idx) => (
              <div className="cell" key={`grid-skeleton-${idx}`}>
                <span className="skeleton-line" />
                <span className="skeleton-line" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <p>Filled squares: {filledCount} / 100</p>
            <p className="hint">{unassignedCount} unassigned squares remaining</p>
            <label className="checkbox-control">
              <input
                type="checkbox"
                checked={showOnlyUnassignedSquares}
                onChange={(event) => setShowOnlyUnassignedSquares(event.target.checked)}
              />
              Show only unassigned squares
            </label>
            <div className="grid">
              {grid.map((row, rowIndex) =>
                row.map((square, colIndex) => {
                  const label = square?.participant_name ?? 'Unassigned';
                  const shouldDeemphasize = showOnlyUnassignedSquares && Boolean(square?.participant_id);
                  const isSelectable = Boolean(square) && !shouldDeemphasize;
                  return (
                    <button
                      key={`${rowIndex}-${colIndex}`}
                      className={`cell ${selectedSquare?.id === square?.id ? 'cell--active' : ''} ${
                        shouldDeemphasize ? 'cell--dimmed' : ''
                      }`}
                      type="button"
                      disabled={!isSelectable}
                      onClick={() => {
                        if (!square || !isSelectable) return;
                        setSelectedSquare(square);
                        setAssignParticipantId(square.participant_id ?? '');
                      }}
                    >
                      <strong>{label}</strong>
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}
      </section>

      <section className="panel">
        <h2>Assign Square</h2>
        {isLocked && <p className="hint">Pool is locked; assignments cannot be changed.</p>}
        {selectedSquare ? (
          <>
            <p>
              Selected: Row {selectedSquare.row_index}, Col {selectedSquare.col_index}
            </p>
            <div className="form-row">
              <select
                value={assignParticipantId}
                onChange={(event) => setAssignParticipantId(event.target.value)}
                disabled={isLocked || isAssigning}
              >
                <option value="">Unassigned</option>
                {participants.map((participant) => (
                  <option key={participant.id} value={participant.id}>
                    {participant.display_name}
                  </option>
                ))}
              </select>
              <button type="button" onClick={handleAssign} disabled={isLocked || isAssigning}>
                {isAssigning ? 'Saving...' : 'Save'}
              </button>
            </div>
          </>
        ) : (
          <p className="hint">Select a square to assign.</p>
        )}
      </section>
    </main>
  );
}
