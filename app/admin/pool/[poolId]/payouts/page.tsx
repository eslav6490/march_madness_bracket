'use client';

import { useEffect, useState } from 'react';

import { AdminLogoutButton } from '@/components/admin-logout-button';
import { useAdminSessionGuard } from '@/components/use-admin-session-guard';
import { ROUND_KEYS, ROUND_LABELS, type RoundKey } from '@/lib/payouts';

type PayoutResponse = {
  payouts: Record<RoundKey, number>;
  last_updated: string | null;
};

const emptyPayouts = ROUND_KEYS.reduce((acc, key) => {
  acc[key] = '';
  return acc;
}, {} as Record<RoundKey, string>);

const JSON_HEADERS = { 'Content-Type': 'application/json' };

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? fallback;
  } catch {
    return fallback;
  }
}

export default function AdminPayoutsPage({ params }: { params: { poolId: string } }) {
  const sessionReady = useAdminSessionGuard();
  const [payouts, setPayouts] = useState<Record<RoundKey, string>>(emptyPayouts);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    async function load() {
      setMessage('');
      const res = await fetch(`/api/admin/pool/${params.poolId}/payouts`, {
        cache: 'no-store'
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          window.location.href = '/admin/login';
          return;
        }
        setMessage(await readErrorMessage(res, 'Failed to load payouts'));
        return;
      }

      const data = (await res.json()) as PayoutResponse;
      const nextPayouts = { ...emptyPayouts } as Record<RoundKey, string>;
      for (const roundKey of ROUND_KEYS) {
        nextPayouts[roundKey] = (data.payouts[roundKey] / 100).toFixed(2);
      }
      setPayouts(nextPayouts);
      setLastUpdated(data.last_updated ?? null);
    }

    if (!sessionReady) return;
    load();
  }, [params.poolId, sessionReady]);

  const handleChange = (roundKey: RoundKey, value: string) => {
    setPayouts((prev) => ({ ...prev, [roundKey]: value }));
  };

  const handleSave = async () => {
    const payload: Record<RoundKey, number> = {} as Record<RoundKey, number>;
    for (const roundKey of ROUND_KEYS) {
      const raw = payouts[roundKey];
      const amount = Number(raw);
      if (!Number.isFinite(amount) || amount < 0) {
        setMessage('All payout amounts must be valid non-negative numbers.');
        return;
      }
      payload[roundKey] = Math.round(amount * 100);
    }

    const res = await fetch(`/api/admin/pool/${params.poolId}/payouts`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ payouts: payload })
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        window.location.href = '/admin/login';
        return;
      }
      setMessage(await readErrorMessage(res, 'Failed to save payouts'));
      return;
    }

    const data = (await res.json()) as PayoutResponse;
    const nextPayouts = { ...emptyPayouts } as Record<RoundKey, string>;
    for (const roundKey of ROUND_KEYS) {
      nextPayouts[roundKey] = (data.payouts[roundKey] / 100).toFixed(2);
    }
    setPayouts(nextPayouts);
    setLastUpdated(data.last_updated ?? null);
    setMessage('Payouts updated.');
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
        <h1>Pool Payouts</h1>
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
        <h2>Payouts</h2>
        <p>Last updated: {lastUpdated ?? 'n/a'}</p>
        <div className="table">
          <div className="table-row table-header">
            <span>Round</span>
            <span>Amount (USD)</span>
            <span></span>
          </div>
          {ROUND_KEYS.map((roundKey) => (
            <div className="table-row" key={roundKey}>
              <span>{ROUND_LABELS[roundKey]}</span>
              <span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={payouts[roundKey]}
                  onChange={(event) => handleChange(roundKey, event.target.value)}
                />
              </span>
              <span></span>
            </div>
          ))}
        </div>
        <div className="form-row">
          <button type="button" onClick={handleSave}>
            Save
          </button>
        </div>
      </section>
    </main>
  );
}
