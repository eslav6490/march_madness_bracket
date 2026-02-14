'use client';

import { FormEvent, useEffect, useState } from 'react';

type AuthResponse = {
  authenticated?: boolean;
  is_admin?: boolean;
  error?: string;
};

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const response = await fetch('/api/admin/auth/session', { cache: 'no-store' });
        const data = (await response.json()) as AuthResponse;
        if (!cancelled && response.ok && data.authenticated && data.is_admin) {
          window.location.href = '/admin';
        }
      } catch {
        // Ignore bootstrap session checks when offline/unavailable.
      }
    }

    checkSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const response = await fetch('/api/admin/auth/login', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = (await response.json()) as AuthResponse;
    if (!response.ok || !data.authenticated) {
      setMessage(data.error ?? 'Login failed.');
      setLoading(false);
      return;
    }

    window.location.href = '/admin';
  };

  return (
    <main>
      <header>
        <span className="badge">Admin</span>
        <h1>Admin Login</h1>
        <p>Sign in with Supabase credentials for an admin user.</p>
      </header>

      <section className="panel">
        <h2>Sign In</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <input
              autoComplete="email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="form-row">
            <input
              autoComplete="current-password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          <div className="form-row">
            <button type="submit" disabled={loading}>
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
            <a className="button-link" href="/admin">
              Back to Admin
            </a>
          </div>
        </form>
        <p className="hint">Your session is stored in a secure HttpOnly cookie.</p>
      </section>

      {message && <div className="message">{message}</div>}
    </main>
  );
}
