import { NextResponse } from 'next/server';

type SupabaseUser = {
  role?: unknown;
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
};

function forbiddenResponse() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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

async function validateSupabaseAdminToken(accessToken: string) {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Supabase auth not configured' }, { status: 500 });
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
  const bearerToken = readBearerToken(request);
  if (bearerToken) {
    return validateSupabaseAdminToken(bearerToken);
  }

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

  return NextResponse.json({ error: 'Admin auth not configured' }, { status: 500 });
}
