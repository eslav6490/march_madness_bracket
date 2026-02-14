'use client';

import { useCallback, useEffect, useState } from 'react';

import { AdminLogoutButton } from '@/components/admin-logout-button';
import { useAdminSessionGuard } from '@/components/use-admin-session-guard';
import { GAME_ROUND_KEYS, GAME_ROUND_LABELS, GAME_STATUSES, type GameRoundKey, type GameStatus } from '@/lib/games';

type GameRow = {
  id: string;
  round_key: GameRoundKey;
  team_a: string;
  team_b: string;
  score_a: number | null;
  score_b: number | null;
  status: GameStatus;
  start_time: string | null;
};

type EditableGame = {
  id: string;
  round_key: GameRoundKey;
  team_a: string;
  team_b: string;
  score_a: string;
  score_b: string;
  status: GameStatus;
  start_time: string;
};

type FormState = {
  round_key: GameRoundKey;
  team_a: string;
  team_b: string;
  status: GameStatus;
  score_a: string;
  score_b: string;
  start_time: string;
};

const emptyForm: FormState = {
  round_key: GAME_ROUND_KEYS[0],
  team_a: '',
  team_b: '',
  status: 'scheduled',
  score_a: '',
  score_b: '',
  start_time: ''
};

const JSON_HEADERS = { 'Content-Type': 'application/json' };

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? fallback;
  } catch {
    return fallback;
  }
}

function toInputDate(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 16);
}

export default function AdminGamesPage({ params }: { params: { poolId: string } }) {
  const sessionReady = useAdminSessionGuard();
  const [message, setMessage] = useState('');
  const [games, setGames] = useState<EditableGame[]>([]);
  const [form, setForm] = useState<FormState>({ ...emptyForm });

  const loadGames = useCallback(async () => {
    setMessage('');
    const res = await fetch(`/api/admin/pool/${params.poolId}/games`, {
      cache: 'no-store'
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        window.location.href = '/admin/login';
        return;
      }
      setMessage(await readErrorMessage(res, 'Failed to load games'));
      return;
    }
    const data = await res.json();
    const nextGames = (data.games as GameRow[]).map((game) => ({
      id: game.id,
      round_key: game.round_key,
      team_a: game.team_a,
      team_b: game.team_b,
      score_a: game.score_a === null ? '' : String(game.score_a),
      score_b: game.score_b === null ? '' : String(game.score_b),
      status: game.status,
      start_time: toInputDate(game.start_time)
    }));
    setGames(nextGames);
  }, [params.poolId]);

  useEffect(() => {
    if (!sessionReady) return;
    loadGames();
  }, [loadGames, sessionReady]);

  const handleCreate = async () => {
    if (!form.team_a.trim() || !form.team_b.trim()) {
      setMessage('Team names are required.');
      return;
    }

    const body = {
      round_key: form.round_key,
      team_a: form.team_a.trim(),
      team_b: form.team_b.trim(),
      status: form.status,
      score_a: form.score_a === '' ? null : Number(form.score_a),
      score_b: form.score_b === '' ? null : Number(form.score_b),
      start_time: form.start_time || null
    };

    const res = await fetch(`/api/admin/pool/${params.poolId}/games`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        window.location.href = '/admin/login';
        return;
      }
      setMessage(await readErrorMessage(res, 'Failed to create game'));
      return;
    }

    setMessage('Game created.');
    setForm({ ...emptyForm });
    await loadGames();
  };

  const handleUpdate = async (game: EditableGame) => {
    const body = {
      round_key: game.round_key,
      team_a: game.team_a.trim(),
      team_b: game.team_b.trim(),
      status: game.status,
      score_a: game.score_a === '' ? null : Number(game.score_a),
      score_b: game.score_b === '' ? null : Number(game.score_b),
      start_time: game.start_time || null
    };

    const res = await fetch(`/api/admin/pool/${params.poolId}/games/${game.id}`, {
      method: 'PATCH',
      headers: JSON_HEADERS,
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        window.location.href = '/admin/login';
        return;
      }
      setMessage(await readErrorMessage(res, 'Failed to update game'));
      return;
    }

    setMessage('Game updated.');
    await loadGames();
  };

  const handleDelete = async (gameId: string) => {
    if (!window.confirm('Delete this game?')) return;
    const res = await fetch(`/api/admin/pool/${params.poolId}/games/${gameId}`, {
      method: 'DELETE'
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        window.location.href = '/admin/login';
        return;
      }
      setMessage(await readErrorMessage(res, 'Failed to delete game'));
      return;
    }

    setMessage('Game deleted.');
    await loadGames();
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
        <h1>Games</h1>
        <p>Pool ID: {params.poolId}</p>
        <div className="form-row">
          <a className="button-link button-secondary" href="/admin">
            Back to Admin
          </a>
          <AdminLogoutButton className="button-secondary" />
        </div>
      </header>

      {message && <div className="message">{message}</div>}

      <section className="panel">
        <h2>Create Game</h2>
        <div className="form-row">
          <select
            value={form.round_key}
            onChange={(event) => setForm((prev) => ({ ...prev, round_key: event.target.value as GameRoundKey }))}
          >
            {GAME_ROUND_KEYS.map((key) => (
              <option key={key} value={key}>
                {GAME_ROUND_LABELS[key]}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Team A"
            value={form.team_a}
            onChange={(event) => setForm((prev) => ({ ...prev, team_a: event.target.value }))}
          />
          <input
            type="text"
            placeholder="Team B"
            value={form.team_b}
            onChange={(event) => setForm((prev) => ({ ...prev, team_b: event.target.value }))}
          />
          <select
            value={form.status}
            onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as GameStatus }))}
          >
            {GAME_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="0"
            placeholder="Score A"
            value={form.score_a}
            onChange={(event) => setForm((prev) => ({ ...prev, score_a: event.target.value }))}
          />
          <input
            type="number"
            min="0"
            placeholder="Score B"
            value={form.score_b}
            onChange={(event) => setForm((prev) => ({ ...prev, score_b: event.target.value }))}
          />
          <input
            type="datetime-local"
            value={form.start_time}
            onChange={(event) => setForm((prev) => ({ ...prev, start_time: event.target.value }))}
          />
          <button type="button" onClick={handleCreate}>
            Create
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>Games</h2>
        <div className="table">
          <div className="table-row table-header">
            <span>Round</span>
            <span>Teams</span>
            <span>Scores</span>
            <span>Status</span>
            <span>Start</span>
            <span>Actions</span>
          </div>
          {games.map((game) => (
            <div className="table-row" key={game.id}>
              <span>
                <select
                  value={game.round_key}
                  onChange={(event) =>
                    setGames((prev) =>
                      prev.map((item) =>
                        item.id === game.id
                          ? { ...item, round_key: event.target.value as GameRoundKey }
                          : item
                      )
                    )
                  }
                >
                  {GAME_ROUND_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {GAME_ROUND_LABELS[key]}
                    </option>
                  ))}
                </select>
              </span>
              <span className="stack">
                <input
                  type="text"
                  value={game.team_a}
                  onChange={(event) =>
                    setGames((prev) =>
                      prev.map((item) => (item.id === game.id ? { ...item, team_a: event.target.value } : item))
                    )
                  }
                />
                <input
                  type="text"
                  value={game.team_b}
                  onChange={(event) =>
                    setGames((prev) =>
                      prev.map((item) => (item.id === game.id ? { ...item, team_b: event.target.value } : item))
                    )
                  }
                />
              </span>
              <span className="stack">
                <input
                  type="number"
                  min="0"
                  value={game.score_a}
                  onChange={(event) =>
                    setGames((prev) =>
                      prev.map((item) => (item.id === game.id ? { ...item, score_a: event.target.value } : item))
                    )
                  }
                />
                <input
                  type="number"
                  min="0"
                  value={game.score_b}
                  onChange={(event) =>
                    setGames((prev) =>
                      prev.map((item) => (item.id === game.id ? { ...item, score_b: event.target.value } : item))
                    )
                  }
                />
              </span>
              <span>
                <select
                  value={game.status}
                  onChange={(event) =>
                    setGames((prev) =>
                      prev.map((item) =>
                        item.id === game.id ? { ...item, status: event.target.value as GameStatus } : item
                      )
                    )
                  }
                >
                  {GAME_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </span>
              <span>
                <input
                  type="datetime-local"
                  value={game.start_time}
                  onChange={(event) =>
                    setGames((prev) =>
                      prev.map((item) => (item.id === game.id ? { ...item, start_time: event.target.value } : item))
                    )
                  }
                />
              </span>
              <span className="actions">
                <button type="button" onClick={() => handleUpdate(game)}>
                  Save
                </button>
                <button type="button" onClick={() => handleDelete(game.id)}>
                  Delete
                </button>
              </span>
            </div>
          ))}
          {games.length === 0 && <p className="hint">No games yet.</p>}
        </div>
      </section>
    </main>
  );
}
