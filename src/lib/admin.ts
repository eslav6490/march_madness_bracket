import { timingSafeEqual } from 'crypto';

import { NextResponse } from 'next/server';

import { clearAdminSessionCookie, getAdminSessionFromRequest } from '@/lib/admin-session';

export const AUTH_NO_STORE_HEADERS = {
  'cache-control': 'no-store'
};

function forbiddenResponse(clearSessionCookie = false) {
  const response = NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: AUTH_NO_STORE_HEADERS });
  if (clearSessionCookie) {
    clearAdminSessionCookie(response);
  }
  return response;
}

function serverErrorResponse(message: string) {
  return NextResponse.json({ error: message }, { status: 500, headers: AUTH_NO_STORE_HEADERS });
}

function secureStringEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');

  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function getAdminCredentials() {
  const email = process.env.ADMIN_EMAIL?.trim() ?? '';
  const password = process.env.ADMIN_PASSWORD ?? '';

  if (!email || !password) return null;
  return { email, password };
}

export function validateConfiguredAdminCredentials(email: string, password: string) {
  const configuredCredentials = getAdminCredentials();
  if (!configuredCredentials) return false;

  return (
    secureStringEquals(configuredCredentials.email.toLowerCase(), email.trim().toLowerCase()) &&
    secureStringEquals(configuredCredentials.password, password)
  );
}

export async function requireAdmin(request: Request) {
  const sessionState = getAdminSessionFromRequest(request);
  if (sessionState.session) {
    if (sessionState.session.role_snapshot === 'admin') return null;
    return forbiddenResponse(true);
  }

  if (sessionState.invalid) {
    return forbiddenResponse(true);
  }

  // Deprecated compatibility fallback for local/testing scripts.
  const adminToken = process.env.ADMIN_TOKEN;
  if (adminToken) {
    const headerToken = request.headers.get('x-admin-token');
    if (headerToken !== adminToken) return forbiddenResponse();
    return null;
  }

  if (getAdminCredentials()) return forbiddenResponse();

  return serverErrorResponse('Admin auth not configured');
}
