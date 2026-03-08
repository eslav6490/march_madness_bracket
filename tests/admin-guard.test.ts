/// <reference types="vitest" />
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { requireAdmin } from '@/lib/admin';
import { encodeAdminSession } from '@/lib/admin-session';

const AUTH_ENV_KEYS = ['ADMIN_TOKEN', 'ADMIN_EMAIL', 'ADMIN_PASSWORD', 'ADMIN_SESSION_SECRET'] as const;

function resetAuthEnv() {
  for (const key of AUTH_ENV_KEYS) {
    delete process.env[key];
  }
}

describe('admin guard', () => {
  beforeEach(() => {
    resetAuthEnv();
  });

  afterEach(() => {
    resetAuthEnv();
    vi.restoreAllMocks();
  });

  it('blocks requests without the admin token', async () => {
    process.env.ADMIN_TOKEN = 'test-token';
    const request = new Request('http://localhost/api/admin/test');

    const response = await requireAdmin(request);
    expect(response?.status).toBe(403);
  });

  it('allows requests with the admin token', async () => {
    process.env.ADMIN_TOKEN = 'test-token';
    const request = new Request('http://localhost/api/admin/test', {
      headers: {
        'x-admin-token': 'test-token'
      }
    });

    const response = await requireAdmin(request);
    expect(response).toBeNull();
  });

  it('allows requests with a valid admin session cookie', async () => {
    process.env.ADMIN_SESSION_SECRET = 'test-secret';
    const cookie = encodeAdminSession({
      sub: 'admin-user',
      exp: Math.floor(Date.now() / 1000) + 60,
      role_snapshot: 'admin'
    });
    expect(cookie).toBeTruthy();

    const request = new Request('http://localhost/api/admin/test', {
      headers: {
        cookie: `admin_session=${encodeURIComponent(cookie ?? '')}`
      }
    });

    const response = await requireAdmin(request);
    expect(response).toBeNull();
  });

  it('blocks expired admin session cookies and clears cookie', async () => {
    process.env.ADMIN_SESSION_SECRET = 'test-secret';
    const cookie = encodeAdminSession({
      sub: 'admin-user',
      exp: Math.floor(Date.now() / 1000) - 1,
      role_snapshot: 'admin'
    });
    expect(cookie).toBeTruthy();

    const request = new Request('http://localhost/api/admin/test', {
      headers: {
        cookie: `admin_session=${encodeURIComponent(cookie ?? '')}`
      }
    });

    const response = await requireAdmin(request);
    expect(response?.status).toBe(403);
    expect(response?.headers.get('set-cookie')).toContain('admin_session=');
  });

  it('blocks tampered admin session cookies', async () => {
    process.env.ADMIN_SESSION_SECRET = 'test-secret';
    const request = new Request('http://localhost/api/admin/test', {
      headers: {
        cookie: 'admin_session=not-a-real-session'
      }
    });

    const response = await requireAdmin(request);
    expect(response?.status).toBe(403);
    expect(response?.headers.get('set-cookie')).toContain('admin_session=');
  });

  it('blocks requests without a session even when credentials are configured', async () => {
    process.env.ADMIN_EMAIL = 'admin@example.com';
    process.env.ADMIN_PASSWORD = 'password';

    const request = new Request('http://localhost/api/admin/test');
    const response = await requireAdmin(request);

    expect(response?.status).toBe(403);
  });
});
