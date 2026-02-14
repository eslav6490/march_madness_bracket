/// <reference types="vitest" />
import { afterEach, describe, expect, it } from 'vitest';

import { decodeAdminSession, encodeAdminSession } from '@/lib/admin-session';

describe('admin session helpers', () => {
  afterEach(() => {
    delete process.env.ADMIN_SESSION_SECRET;
  });

  it('encodes and decodes session payloads', () => {
    process.env.ADMIN_SESSION_SECRET = 'session-secret';
    const payload = {
      sub: 'admin-user',
      exp: Math.floor(Date.now() / 1000) + 300,
      role_snapshot: 'admin' as const
    };

    const encoded = encodeAdminSession(payload);
    expect(encoded).toBeTruthy();
    const decoded = decodeAdminSession(encoded ?? '');
    expect(decoded).toEqual(payload);
  });

  it('rejects tampered session values', () => {
    process.env.ADMIN_SESSION_SECRET = 'session-secret';
    const payload = {
      sub: 'admin-user',
      exp: Math.floor(Date.now() / 1000) + 300,
      role_snapshot: 'admin' as const
    };
    const encoded = encodeAdminSession(payload);
    expect(encoded).toBeTruthy();

    const tampered = `${encoded}tamper`;
    expect(decodeAdminSession(tampered)).toBeNull();
  });

  it('returns null when session secret is missing', () => {
    const payload = {
      sub: 'admin-user',
      exp: Math.floor(Date.now() / 1000) + 300,
      role_snapshot: 'admin' as const
    };

    expect(encodeAdminSession(payload)).toBeNull();
  });
});
