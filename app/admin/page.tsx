'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type Pool = {
  id: string;
  name: string;
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

export default function AdminPage() {
  const [token, setToken] = useState('');
  const [pool, setPool] = useState<Pool | null>(null);
  const [squares, setSquares] = useState<Square[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [assignParticipantId, setAssignParticipantId] = useState<string>('');
  const [newParticipantName, setNewParticipantName] = useState('');
  const [newParticipantContact, setNewParticipantContact] = useState('');
  const [message, setMessage] = useState<string>('');
  const [digitMap, setDigitMap] = useState<DigitMap | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem('adminToken');
    if (stored) {
      setToken(stored);
    }
  }, []);

  const authHeaders = useMemo(() => {
    const headers = new Headers({ 'Content-Type': 'application/json' });
    if (token) {
      headers.set('x-admin-token', token);
    }
    return headers;
  }, [token]);

  const loadPool = useCallback(async () => {
    const res = await fetch('/api/pool', { cache: 'no-store' });
    const data = await res.json();
    setPool(data.pool);
    setSquares(data.squares);
  }, []);

  const loadParticipants = useCallback(
    async (poolId: string) => {
      const res = await fetch(`/api/admin/pools/${poolId}/participants`, {
        headers: authHeaders,
        cache: 'no-store'
      });
      if (!res.ok) {
        const error = await res.json();
        setMessage(error.error ?? 'Failed to load participants');
        return;
      }
      const data = await res.json();
      setParticipants(data.participants ?? []);
    },
    [authHeaders]
  );

  const loadDigitMap = useCallback(
    async (poolId: string) => {
      const res = await fetch(`/api/admin/pool/${poolId}/digits`, {
        headers: authHeaders,
        cache: 'no-store'
      });
      if (!res.ok) {
        const error = await res.json();
        setMessage(error.error ?? 'Failed to load digit map');
        return;
      }
      const data = await res.json();
      setDigitMap(data.digit_map ?? null);
    },
    [authHeaders]
  );

  const loadAll = useCallback(async () => {
    setMessage('');
    await loadPool();
  }, [loadPool]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (pool && token) {
      loadParticipants(pool.id);
      loadDigitMap(pool.id);
    }
  }, [pool, token, loadParticipants, loadDigitMap]);

  const grid = useMemo(() => {
    const base = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null) as Array<Square | null>);
    for (const square of squares) {
      base[square.row_index][square.col_index] = square;
    }
    return base;
  }, [squares]);

  const filledCount = squares.filter((square) => square.participant_id).length;

  const handleSaveToken = () => {
    window.localStorage.setItem('adminToken', token);
    setMessage('Admin token saved.');
    if (pool) {
      loadParticipants(pool.id);
    }
  };

  const handleCreateParticipant = async () => {
    if (!pool) return;
    if (!newParticipantName.trim()) {
      setMessage('Participant name is required.');
      return;
    }

    const res = await fetch(`/api/admin/pools/${pool.id}/participants`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        display_name: newParticipantName.trim(),
        contact_info: newParticipantContact.trim() || null
      })
    });

    if (!res.ok) {
      const error = await res.json();
      setMessage(error.error ?? 'Failed to create participant');
      return;
    }

    const data = await res.json();
    setParticipants((prev) => [...prev, data.participant]);
    setNewParticipantName('');
    setNewParticipantContact('');
    setMessage('Participant created.');
  };

  const handleEditParticipant = async (participant: Participant) => {
    const displayName = window.prompt('Edit participant name', participant.display_name);
    if (!displayName) return;
    const contactInfo = window.prompt('Edit contact info (optional)', participant.contact_info ?? '') ?? '';

    const res = await fetch(`/api/admin/participants/${participant.id}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ display_name: displayName.trim(), contact_info: contactInfo.trim() || null })
    });

    if (!res.ok) {
      const error = await res.json();
      setMessage(error.error ?? 'Failed to update participant');
      return;
    }

    const data = await res.json();
    setParticipants((prev) =>
      prev.map((item) => (item.id === participant.id ? { ...item, ...data.participant } : item))
    );
    setMessage('Participant updated.');
  };

  const handleDeleteParticipant = async (participant: Participant) => {
    if (!window.confirm(`Delete ${participant.display_name}?`)) return;

    let res = await fetch(`/api/admin/participants/${participant.id}`, {
      method: 'DELETE',
      headers: authHeaders
    });

    if (res.status === 409) {
      const data = await res.json();
      const confirmForce = window.confirm(
        `${participant.display_name} owns ${data.ownedSquares} squares. Remove and unassign all?`
      );
      if (!confirmForce) return;
      res = await fetch(`/api/admin/participants/${participant.id}?force=true`, {
        method: 'DELETE',
        headers: authHeaders
      });
    }

    if (!res.ok) {
      const error = await res.json();
      setMessage(error.error ?? 'Failed to delete participant');
      return;
    }

    setParticipants((prev) => prev.filter((item) => item.id !== participant.id));
    setSquares((prev) =>
      prev.map((square) =>
        square.participant_id === participant.id ? { ...square, participant_id: null, participant_name: null } : square
      )
    );
    setMessage('Participant deleted.');
  };

  const handleAssign = async () => {
    if (!pool || !selectedSquare) return;
    const res = await fetch(`/api/admin/pools/${pool.id}/squares`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        row_index: selectedSquare.row_index,
        col_index: selectedSquare.col_index,
        participant_id: assignParticipantId || null
      })
    });

    if (!res.ok) {
      const error = await res.json();
      setMessage(error.error ?? 'Failed to assign square');
      return;
    }

    const data = await res.json();
    const updatedSquare = data.square as Square;
    setSquares((prev) => prev.map((square) => (square.id === updatedSquare.id ? updatedSquare : square)));
    setSelectedSquare(updatedSquare);
    if (pool) {
      loadParticipants(pool.id);
    }
  };

  const callDigitAction = async (action: 'randomize' | 'reveal' | 'lock') => {
    if (!pool) return;
    if (!window.confirm(`Confirm ${action}?`)) return;

    const endpoint =
      action === 'lock'
        ? `/api/admin/pool/${pool.id}/lock`
        : `/api/admin/pool/${pool.id}/digits/${action}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: authHeaders
    });

    if (!res.ok) {
      const error = await res.json();
      setMessage(error.error ?? `Failed to ${action} digits`);
      return;
    }

    const data = await res.json();
    setDigitMap(data.digit_map ?? data);
    setMessage(`${action} complete.`);
  };

  return (
    <main>
      <header>
        <span className="badge">Admin</span>
        <h1>Pool Admin</h1>
        <p>Manage participants and assign squares.</p>
      </header>

      <section className="panel">
        <h2>Admin Token</h2>
        <p>Set your admin token to enable write actions.</p>
        <div className="form-row">
          <input
            type="password"
            placeholder="Admin token"
            value={token}
            onChange={(event) => setToken(event.target.value)}
          />
          <button type="button" onClick={handleSaveToken}>
            Save Token
          </button>
        </div>
        <p className="hint">Set `ADMIN_TOKEN` in your environment and use it here.</p>
      </section>

      {message && <div className="message">{message}</div>}

      <section className="panel">
        <h2>Participants</h2>
        <div className="form-row">
          <input
            type="text"
            placeholder="Display name"
            value={newParticipantName}
            onChange={(event) => setNewParticipantName(event.target.value)}
          />
          <input
            type="text"
            placeholder="Contact info (optional)"
            value={newParticipantContact}
            onChange={(event) => setNewParticipantContact(event.target.value)}
          />
          <button type="button" onClick={handleCreateParticipant}>
            Add
          </button>
        </div>
        <div className="table">
          <div className="table-row table-header">
            <span>Name</span>
            <span>Squares</span>
            <span>Actions</span>
          </div>
          {participants.map((participant) => (
            <div className="table-row" key={participant.id}>
              <span>{participant.display_name}</span>
              <span>{participant.square_count ?? 0}</span>
              <span className="actions">
                <button type="button" onClick={() => handleEditParticipant(participant)}>
                  Edit
                </button>
                <button type="button" onClick={() => handleDeleteParticipant(participant)}>
                  Delete
                </button>
              </span>
            </div>
          ))}
          {participants.length === 0 && <p className="hint">No participants yet.</p>}
        </div>
      </section>

      <section className="panel">
        <h2>Digit Map</h2>
        <div className="form-row">
          <button type="button" onClick={() => callDigitAction('randomize')}>
            Randomize
          </button>
          <button type="button" onClick={() => callDigitAction('reveal')}>
            Reveal
          </button>
          <button type="button" onClick={() => callDigitAction('lock')}>
            Lock
          </button>
        </div>
        {digitMap ? (
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
        <p>Filled squares: {filledCount} / 100</p>
        <div className="grid">
          {grid.map((row, rowIndex) =>
            row.map((square, colIndex) => {
              const label = square?.participant_name ?? 'Unassigned';
              return (
                <button
                  key={`${rowIndex}-${colIndex}`}
                  className={`cell ${selectedSquare?.id === square?.id ? 'cell--active' : ''}`}
                  type="button"
                  onClick={() => {
                    if (!square) return;
                    setSelectedSquare(square);
                    setAssignParticipantId(square.participant_id ?? '');
                  }}
                >
                  <span>Row {rowIndex}, Col {colIndex}</span>
                  <strong>{label}</strong>
                </button>
              );
            })
          )}
        </div>
      </section>

      <section className="panel">
        <h2>Assign Square</h2>
        {selectedSquare ? (
          <>
            <p>
              Selected: Row {selectedSquare.row_index}, Col {selectedSquare.col_index}
            </p>
            <div className="form-row">
              <select value={assignParticipantId} onChange={(event) => setAssignParticipantId(event.target.value)}>
                <option value="">Unassigned</option>
                {participants.map((participant) => (
                  <option key={participant.id} value={participant.id}>
                    {participant.display_name}
                  </option>
                ))}
              </select>
              <button type="button" onClick={handleAssign}>
                Save
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
