import { NextResponse } from 'next/server';

import { AUTH_NO_STORE_HEADERS, validateConfiguredAdminCredentials } from '@/lib/admin';
import { setAdminSessionCookie } from '@/lib/admin-session';

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: AUTH_NO_STORE_HEADERS });
}

function parsePositiveInt(value: unknown, fallback: number) {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }
  return fallback;
}

export async function POST(request: Request) {
  let email = '';
  let password = '';

  try {
    const body = (await request.json()) as { email?: unknown; password?: unknown };
    if (typeof body.email === 'string') email = body.email.trim();
    if (typeof body.password === 'string') password = body.password;
  } catch {
    return jsonError('Invalid request body', 400);
  }

  if (!email || !password) {
    return jsonError('Email and password are required', 400);
  }

  if (!validateConfiguredAdminCredentials(email, password)) {
    return jsonError('Invalid email or password', 401);
  }

  const response = NextResponse.json({ authenticated: true }, { status: 200, headers: AUTH_NO_STORE_HEADERS });
  const expiresIn = parsePositiveInt(process.env.ADMIN_SESSION_TTL_SECONDS, 60 * 60 * 24 * 7);
  const cookieWasSet = setAdminSessionCookie(response, {
    sub: email.toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + expiresIn,
    role_snapshot: 'admin'
  });

  if (!cookieWasSet) {
    return jsonError('Admin session not configured', 500);
  }

  return response;
}
