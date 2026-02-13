'use client';

import { useEffect, useMemo, useState } from 'react';

import { ROUND_KEYS, ROUND_LABELS, type RoundKey } from '@/lib/payouts';

type PayoutResponse = {
  payouts: Record<RoundKey, number>;
  last_updated: string | null;
};

const emptyPayouts = ROUND_KEYS.reduce((acc, key) => {
  acc[key] = '';
  return acc;
}, {} as Record<RoundKey, string>);

export default function AdminPayoutsPage({ params }: { params: { poolId: string } }) {
  const [token, setToken] = useState('');
  const [payouts, setPayouts] = useState<Record<RoundKey, string>>(emptyPayouts);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');

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

  useEffect(() => {
    async function load() {
      setMessage('');
      const res = await fetch(`/api/admin/pool/${params.poolId}/payouts`, {
        headers: authHeaders,
        cache: 'no-store'
      });

      if (!res.ok) {
        const error = await res.json();
        setMessage(error.error ?? 'Failed to load payouts');
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

    if (token) {
      load();
    }
  }, [authHeaders, params.poolId, token]);

  const handleSaveToken = () => {
    window.localStorage.setItem('adminToken', token);
    setMessage('Session token saved.');
  };

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
      headers: authHeaders,
      body: JSON.stringify({ payouts: payload })
    });

    if (!res.ok) {
      const error = await res.json();
      setMessage(error.error ?? 'Failed to save payouts');
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

  return (
    <main>
      <header>
        <span className="badge">Admin</span>
        <h1>Pool Payouts</h1>
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
