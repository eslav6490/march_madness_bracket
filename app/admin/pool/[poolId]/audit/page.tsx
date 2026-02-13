'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type AuditEvent = {
  id: string;
  pool_id: string | null;
  actor: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: any;
  created_at: string;
};

type Cursor = { before: string; before_id: string } | null;

export default function AdminAuditPage({ params }: { params: { poolId: string } }) {
  const [token, setToken] = useState('');
  const [message, setMessage] = useState('');
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [cursor, setCursor] = useState<Cursor>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem('adminToken');
    if (stored) {
      setToken(stored);
    }
  }, []);

  const authHeaders = useMemo(() => {
    const headers = new Headers({ 'Content-Type': 'application/json' });
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }, [token]);

  const load = useCallback(
    async (mode: 'reset' | 'more') => {
      if (!token) return;
      setLoading(true);
      setMessage('');
      try {
        const sp = new URLSearchParams();
        sp.set('limit', '50');
        const useCursor = mode === 'more' ? cursor : null;
        if (useCursor) {
          sp.set('before', useCursor.before);
          sp.set('before_id', useCursor.before_id);
        }

        const res = await fetch(`/api/admin/pool/${params.poolId}/audit?${sp.toString()}`, {
          headers: authHeaders,
          cache: 'no-store'
        });
        if (!res.ok) {
          const error = await res.json();
          setMessage(error.error ?? 'Failed to load audit events');
          return;
        }
        const data = await res.json();
        const nextEvents = (data.events ?? []) as AuditEvent[];
        const nextCursor = (data.next_cursor ?? null) as Cursor;
        setCursor(nextCursor);
        setEvents((prev) => (mode === 'reset' ? nextEvents : [...prev, ...nextEvents]));
      } finally {
        setLoading(false);
      }
    },
    [authHeaders, cursor, params.poolId, token]
  );

  useEffect(() => {
    if (token) {
      load('reset');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSaveToken = () => {
    window.localStorage.setItem('adminToken', token);
    setMessage('Session token saved.');
  };

  return (
    <main>
      <header>
        <span className="badge">Admin</span>
        <h1>Audit Log</h1>
        <p>Pool ID: {params.poolId}</p>
      </header>

      <section className="panel">
        <h2>Admin Session</h2>
        <div className="form-row">
          <input
            type="password"
            placeholder="Supabase access token"
            value={token}
            onChange={(event) => setToken(event.target.value)}
          />
          <button type="button" onClick={handleSaveToken}>
            Save Session
          </button>
          <a className="button-link" href="/admin/login">
            Login
          </a>
        </div>
      </section>

      {message && <div className="message">{message}</div>}

      <section className="panel">
        <h2>Events</h2>
        <div className="table">
          <div className="table-row table-header" style={{ gridTemplateColumns: '2fr 1fr 1fr 3fr' }}>
            <span>Time</span>
            <span>Action</span>
            <span>Entity</span>
            <span>Metadata</span>
          </div>
          {events.map((event) => (
            <div className="table-row" style={{ gridTemplateColumns: '2fr 1fr 1fr 3fr' }} key={event.id}>
              <span>{new Date(event.created_at).toLocaleString()}</span>
              <span>{event.action}</span>
              <span>
                {(event.entity_type ?? 'n/a') + (event.entity_id ? `:${event.entity_id}` : '')}
              </span>
              <span>
                <code style={{ whiteSpace: 'pre-wrap' }}>{safeJson(event.metadata)}</code>
              </span>
            </div>
          ))}
        </div>

        <div className="form-row">
          <button type="button" onClick={() => load('reset')} disabled={loading || !token}>
            Refresh
          </button>
          <button type="button" onClick={() => load('more')} disabled={loading || !cursor || !token}>
            Load More
          </button>
        </div>
      </section>
    </main>
  );
}

function safeJson(value: any): string {
  try {
    return JSON.stringify(value ?? {}, null, 0);
  } catch {
    return '[unserializable metadata]';
  }
}
