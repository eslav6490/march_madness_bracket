import { NextResponse } from 'next/server';

import { AUTH_NO_STORE_HEADERS, validateSupabaseAdminToken } from '@/lib/admin';
import { setAdminSessionCookie } from '@/lib/admin-session';

type PasswordGrantResponse = {
  access_token?: unknown;
  expires_in?: unknown;
  user?: {
    id?: unknown;
  } | null;
};

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
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonError('Supabase auth not configured', 500);
  }

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

  const grantResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ email, password }),
    cache: 'no-store'
  });

  let grantBody: PasswordGrantResponse = {};
  try {
    grantBody = (await grantResponse.json()) as PasswordGrantResponse;
  } catch {
    grantBody = {};
  }

  const accessToken = typeof grantBody.access_token === 'string' ? grantBody.access_token : '';
  if (!grantResponse.ok || !accessToken) {
    return jsonError('Invalid email or password', 401);
  }

  const adminValidation = await validateSupabaseAdminToken(accessToken);
  if (adminValidation) {
    if (adminValidation.status === 500) return adminValidation;
    return jsonError('Forbidden', 403);
  }

  const userId = typeof grantBody.user?.id === 'string' ? grantBody.user.id : '';
  if (!userId) {
    return jsonError('Invalid auth response', 502);
  }

  const expiresIn = parsePositiveInt(grantBody.expires_in, 60 * 60);
  const response = NextResponse.json({ authenticated: true }, { status: 200, headers: AUTH_NO_STORE_HEADERS });
  const cookieWasSet = setAdminSessionCookie(response, {
    sub: userId,
    exp: Math.floor(Date.now() / 1000) + expiresIn,
    role_snapshot: 'admin'
  });

  if (!cookieWasSet) {
    return jsonError('Admin session not configured', 500);
  }

  return response;
}
