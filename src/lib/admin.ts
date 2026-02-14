import { NextResponse } from 'next/server';

import { clearAdminSessionCookie, getAdminSessionFromRequest } from '@/lib/admin-session';

type SupabaseUser = {
  id?: unknown;
  role?: unknown;
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
};

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

function readBearerToken(request: Request) {
  const header = request.headers.get('authorization');
  if (!header) return null;

  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

function readRoleValues(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata) return [];

  const roleValues: string[] = [];
  const role = metadata.role;
  const roles = metadata.roles;

  if (typeof role === 'string') roleValues.push(role);
  if (Array.isArray(roles)) {
    for (const value of roles) {
      if (typeof value === 'string') roleValues.push(value);
    }
  }

  return roleValues;
}

function isSupabaseAdmin(user: SupabaseUser) {
  const roleValues = [
    ...(typeof user.role === 'string' ? [user.role] : []),
    ...readRoleValues(user.app_metadata),
    ...readRoleValues(user.user_metadata)
  ].map((role) => role.toLowerCase());

  return roleValues.includes('admin');
}

export async function validateSupabaseAdminToken(accessToken: string) {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return serverErrorResponse('Supabase auth not configured');
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey,
      authorization: `Bearer ${accessToken}`
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    return forbiddenResponse();
  }

  const user = (await response.json()) as SupabaseUser;
  if (!isSupabaseAdmin(user)) {
    return forbiddenResponse();
  }

  return null;
}

export async function requireAdmin(request: Request) {
  const sessionState = getAdminSessionFromRequest(request);
  if (sessionState.session) {
    if (sessionState.session.role_snapshot === 'admin') return null;

    if (sessionState.session.access_token) {
      const tokenValidationResponse = await validateSupabaseAdminToken(sessionState.session.access_token);
      if (!tokenValidationResponse) return null;
    }

    return forbiddenResponse(true);
  }

  if (sessionState.invalid) {
    return forbiddenResponse(true);
  }

  const bearerToken = readBearerToken(request);
  if (bearerToken) {
    return validateSupabaseAdminToken(bearerToken);
  }

  // Deprecated compatibility fallback for local/testing scripts.
  const adminToken = process.env.ADMIN_TOKEN;
  if (adminToken) {
    const headerToken = request.headers.get('x-admin-token');
    if (headerToken !== adminToken) return forbiddenResponse();
    return null;
  }

  const supabaseConfigured = Boolean(
    (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      (process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
  if (supabaseConfigured) return forbiddenResponse();

  return serverErrorResponse('Admin auth not configured');
}
