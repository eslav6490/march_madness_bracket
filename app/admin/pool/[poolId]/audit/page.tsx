'use client';

import { useCallback, useEffect, useState } from 'react';

import { AdminLogoutButton } from '@/components/admin-logout-button';
import { AdminPoolNav } from '@/components/admin-pool-nav';
import { useAdminSessionGuard } from '@/components/use-admin-session-guard';

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

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? fallback;
  } catch {
    return fallback;
  }
}

export default function AdminAuditPage({ params }: { params: { poolId: string } }) {
  const sessionReady = useAdminSessionGuard();
  const [message, setMessage] = useState('');
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [cursor, setCursor] = useState<Cursor>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMode, setLoadingMode] = useState<'reset' | 'more'>('reset');
  const [hasLoaded, setHasLoaded] = useState(false);

  const load = useCallback(
    async (mode: 'reset' | 'more') => {
      if (!sessionReady) return;
      setLoading(true);
      setLoadingMode(mode);
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
          cache: 'no-store'
        });
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            window.location.href = '/admin/login';
            return;
          }
          setMessage(await readErrorMessage(res, 'Failed to load audit events'));
          return;
        }
        const data = await res.json();
        const nextEvents = (data.events ?? []) as AuditEvent[];
        const nextCursor = (data.next_cursor ?? null) as Cursor;
        setCursor(nextCursor);
        setEvents((prev) => (mode === 'reset' ? nextEvents : [...prev, ...nextEvents]));
        setHasLoaded(true);
      } finally {
        setLoading(false);
      }
    },
    [cursor, params.poolId, sessionReady]
  );

  useEffect(() => {
    if (!sessionReady) return;
    load('reset');
  }, [load, sessionReady]);

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
        <h1>Audit Log</h1>
        <p>Pool ID: {params.poolId}</p>
        <AdminPoolNav poolId={params.poolId} activeKey="audit" />
        <div className="form-row">
          <AdminLogoutButton className="button-secondary" />
        </div>
      </header>

      {message && <div className="message">{message}</div>}

      <section className="panel">
        <h2>Events</h2>

        {loading && !hasLoaded ? (
          <div className="table" aria-label="Loading audit events">
            <div className="table-row table-header" style={{ gridTemplateColumns: '2fr 1fr 1fr 3fr' }}>
              <span>Time</span>
              <span>Action</span>
              <span>Entity</span>
              <span>Metadata</span>
            </div>
            {Array.from({ length: 3 }).map((_, idx) => (
              <div className="table-row" style={{ gridTemplateColumns: '2fr 1fr 1fr 3fr' }} key={`audit-skeleton-${idx}`}>
                <span className="skeleton-line" />
                <span className="skeleton-line" />
                <span className="skeleton-line" />
                <span className="skeleton-line" />
              </div>
            ))}
          </div>
        ) : (
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
            {hasLoaded && events.length === 0 && <p className="hint">No audit events yet.</p>}
          </div>
        )}

        <div className="form-row">
          <button type="button" onClick={() => load('reset')} disabled={loading || !sessionReady}>
            {loading && loadingMode === 'reset' ? 'Refreshing...' : 'Refresh'}
          </button>
          <button type="button" onClick={() => load('more')} disabled={loading || !cursor || !sessionReady}>
            {loading && loadingMode === 'more' ? 'Loading More...' : 'Load More'}
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
