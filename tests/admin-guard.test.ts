/// <reference types="vitest" />
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { requireAdmin } from '@/lib/admin';

const AUTH_ENV_KEYS = [
  'ADMIN_TOKEN',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
] as const;

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

  it('allows requests with a Supabase bearer token for admin users', async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon-key';
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ app_metadata: { roles: ['admin'] } }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const request = new Request('http://localhost/api/admin/test', {
      headers: {
        Authorization: 'Bearer supabase-token'
      }
    });

    const response = await requireAdmin(request);
    expect(response).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.supabase.co/auth/v1/user',
      expect.objectContaining({
        headers: expect.objectContaining({
          apikey: 'anon-key',
          authorization: 'Bearer supabase-token'
        })
      })
    );
  });

  it('blocks Supabase-authenticated non-admin users', async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon-key';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ app_metadata: { roles: ['viewer'] } }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      )
    );

    const request = new Request('http://localhost/api/admin/test', {
      headers: {
        Authorization: 'Bearer supabase-token'
      }
    });

    const response = await requireAdmin(request);
    expect(response?.status).toBe(403);
  });
});
