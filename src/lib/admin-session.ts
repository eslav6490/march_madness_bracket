import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

import type { NextResponse } from 'next/server';

export const ADMIN_SESSION_COOKIE_NAME = 'admin_session';

export type AdminSessionPayload = {
  sub: string;
  exp: number;
  role_snapshot?: 'admin';
  access_token?: string;
};

const IV_LENGTH = 12;

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET ?? '';
}

function getSessionKey() {
  const secret = getSessionSecret();
  if (!secret) return null;
  return createHash('sha256').update(secret).digest();
}

function asBase64Url(value: Buffer) {
  return value.toString('base64url');
}

function fromBase64Url(value: string) {
  return Buffer.from(value, 'base64url');
}

function parseInteger(value: unknown) {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isInteger(Number(value))) return Number(value);
  return null;
}

function isValidSessionPayload(value: unknown): value is AdminSessionPayload {
  if (!value || typeof value !== 'object') return false;

  const maybePayload = value as Partial<AdminSessionPayload>;
  if (typeof maybePayload.sub !== 'string' || maybePayload.sub.length === 0) return false;
  if (parseInteger(maybePayload.exp) === null) return false;
  if (maybePayload.role_snapshot && maybePayload.role_snapshot !== 'admin') return false;
  if (maybePayload.access_token && typeof maybePayload.access_token !== 'string') return false;

  return true;
}

export function encodeAdminSession(payload: AdminSessionPayload) {
  const key = getSessionKey();
  if (!key) return null;

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${asBase64Url(iv)}.${asBase64Url(encrypted)}.${asBase64Url(tag)}`;
}

export function decodeAdminSession(value: string) {
  const key = getSessionKey();
  if (!key) return null;

  const parts = value.split('.');
  if (parts.length !== 3) return null;

  try {
    const iv = fromBase64Url(parts[0]);
    const encrypted = fromBase64Url(parts[1]);
    const tag = fromBase64Url(parts[2]);

    if (iv.length !== IV_LENGTH) return null;
    if (tag.length !== 16) return null;

    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    const decoded = JSON.parse(plaintext.toString('utf8')) as unknown;

    if (!isValidSessionPayload(decoded)) return null;

    return {
      sub: decoded.sub,
      exp: parseInteger(decoded.exp) ?? 0,
      role_snapshot: decoded.role_snapshot,
      access_token: decoded.access_token
    } satisfies AdminSessionPayload;
  } catch {
    return null;
  }
}

export function readCookieValue(cookieHeader: string | null, cookieName: string) {
  if (!cookieHeader) return null;
  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const separator = pair.indexOf('=');
    if (separator === -1) continue;

    const key = pair.slice(0, separator).trim();
    if (key !== cookieName) continue;

    const rawValue = pair.slice(separator + 1).trim();
    try {
      return decodeURIComponent(rawValue);
    } catch {
      return null;
    }
  }
  return null;
}

export function getAdminSessionFromRequest(request: Request) {
  const cookieValue = readCookieValue(request.headers.get('cookie'), ADMIN_SESSION_COOKIE_NAME);
  if (!cookieValue) {
    return { session: null, invalid: false } as const;
  }

  const session = decodeAdminSession(cookieValue);
  if (!session) {
    return { session: null, invalid: true } as const;
  }

  if (session.exp <= Math.floor(Date.now() / 1000)) {
    return { session: null, invalid: true } as const;
  }

  return { session, invalid: false } as const;
}

function baseCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/'
  };
}

export function setAdminSessionCookie(response: NextResponse, payload: AdminSessionPayload) {
  const encoded = encodeAdminSession(payload);
  if (!encoded) return false;

  const nowSeconds = Math.floor(Date.now() / 1000);
  const maxAge = Math.max(payload.exp - nowSeconds, 0);

  response.cookies.set({
    ...baseCookieOptions(),
    name: ADMIN_SESSION_COOKIE_NAME,
    value: encoded,
    expires: new Date(payload.exp * 1000),
    maxAge
  });

  return true;
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set({
    ...baseCookieOptions(),
    name: ADMIN_SESSION_COOKIE_NAME,
    value: '',
    maxAge: 0,
    expires: new Date(0)
  });
}
