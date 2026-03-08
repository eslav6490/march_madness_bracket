/// <reference types="vitest" />
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { encodeAdminSession } from '@/lib/admin-session';

const AUTH_ENV_KEYS = [
  'ADMIN_TOKEN',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
  'ADMIN_SESSION_SECRET',
  'ADMIN_SESSION_TTL_SECONDS'
] as const;

function resetAuthEnv() {
  for (const key of AUTH_ENV_KEYS) {
    delete process.env[key];
  }
}

describe('admin auth routes', () => {
  beforeEach(() => {
    resetAuthEnv();
  });

  afterEach(() => {
    resetAuthEnv();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('login sets an admin session cookie for valid admin credentials', async () => {
    process.env.ADMIN_SESSION_SECRET = 'test-session-secret';
    process.env.ADMIN_EMAIL = 'admin@example.com';
    process.env.ADMIN_PASSWORD = 'passw0rd';

    const { POST } = await import('../app/api/admin/auth/login/route');
    const response = await POST(
      new Request('http://localhost/api/admin/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'admin@example.com', password: 'passw0rd' })
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const setCookie = response.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('admin_session=');
    expect(setCookie.toLowerCase()).toContain('httponly');

    const body = (await response.json()) as { authenticated: boolean };
    expect(body.authenticated).toBe(true);
  });

  it('login rejects invalid credentials', async () => {
    process.env.ADMIN_SESSION_SECRET = 'test-session-secret';
    process.env.ADMIN_EMAIL = 'admin@example.com';
    process.env.ADMIN_PASSWORD = 'passw0rd';

    const { POST } = await import('../app/api/admin/auth/login/route');
    const response = await POST(
      new Request('http://localhost/api/admin/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'admin@example.com', password: 'wrong' })
      })
    );

    expect(response.status).toBe(401);
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('login rejects when admin credentials are not configured', async () => {
    process.env.ADMIN_SESSION_SECRET = 'test-session-secret';

    const { POST } = await import('../app/api/admin/auth/login/route');
    const response = await POST(
      new Request('http://localhost/api/admin/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'admin@example.com', password: 'passw0rd' })
      })
    );

    expect(response.status).toBe(401);
  });

  it('logout clears the admin session cookie', async () => {
    const { POST } = await import('../app/api/admin/auth/logout/route');
    const response = await POST();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const setCookie = response.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('admin_session=');
    expect(setCookie.toLowerCase()).toContain('max-age=0');
  });

  it('session endpoint reports authenticated for valid cookie session', async () => {
    process.env.ADMIN_SESSION_SECRET = 'test-session-secret';
    const cookie = encodeAdminSession({
      sub: 'admin-user-id',
      exp: Math.floor(Date.now() / 1000) + 120,
      role_snapshot: 'admin'
    });
    expect(cookie).toBeTruthy();

    const { GET } = await import('../app/api/admin/auth/session/route');
    const response = await GET(
      new Request('http://localhost/api/admin/auth/session', {
        headers: {
          cookie: `admin_session=${encodeURIComponent(cookie ?? '')}`
        }
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const body = (await response.json()) as { authenticated: boolean; is_admin: boolean };
    expect(body.authenticated).toBe(true);
    expect(body.is_admin).toBe(true);
  });

  it('session endpoint clears invalid session cookie and reports unauthenticated', async () => {
    process.env.ADMIN_SESSION_SECRET = 'test-session-secret';
    const { GET } = await import('../app/api/admin/auth/session/route');

    const response = await GET(
      new Request('http://localhost/api/admin/auth/session', {
        headers: {
          cookie: 'admin_session=bad-value'
        }
      })
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { authenticated: boolean; is_admin: boolean };
    expect(body.authenticated).toBe(false);
    expect(body.is_admin).toBe(false);
    const setCookie = response.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('admin_session=');
    expect(setCookie.toLowerCase()).toContain('max-age=0');
  });
});
