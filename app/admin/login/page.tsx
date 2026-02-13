'use client';

import { FormEvent, useState } from 'react';

const TOKEN_STORAGE_KEY = 'adminToken';

type AuthResponse = {
  access_token?: string;
  error_description?: string;
  msg?: string;
};

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      setMessage('Supabase auth is not configured in NEXT_PUBLIC env vars.');
      setLoading(false);
      return;
    }

    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = (await response.json()) as AuthResponse;
    if (!response.ok || !data.access_token) {
      setMessage(data.error_description ?? data.msg ?? 'Login failed.');
      setLoading(false);
      return;
    }

    window.localStorage.setItem(TOKEN_STORAGE_KEY, data.access_token);
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
        <p className="hint">Your Supabase JWT must include an admin role in metadata.</p>
      </section>

      {message && <div className="message">{message}</div>}
    </main>
  );
}
