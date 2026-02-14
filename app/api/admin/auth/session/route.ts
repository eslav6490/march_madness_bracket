import { NextResponse } from 'next/server';

import { AUTH_NO_STORE_HEADERS } from '@/lib/admin';
import { clearAdminSessionCookie, getAdminSessionFromRequest } from '@/lib/admin-session';

export async function GET(request: Request) {
  const sessionState = getAdminSessionFromRequest(request);
  if (sessionState.session) {
    return NextResponse.json(
      { authenticated: true, is_admin: sessionState.session.role_snapshot === 'admin' },
      { status: 200, headers: AUTH_NO_STORE_HEADERS }
    );
  }

  const adminToken = process.env.ADMIN_TOKEN;
  const legacyToken = request.headers.get('x-admin-token');
  if (adminToken && legacyToken === adminToken) {
    return NextResponse.json(
      { authenticated: true, is_admin: true, legacy_admin_token: true },
      { status: 200, headers: AUTH_NO_STORE_HEADERS }
    );
  }

  const response = NextResponse.json(
    { authenticated: false, is_admin: false },
    { status: 200, headers: AUTH_NO_STORE_HEADERS }
  );

  if (sessionState.invalid) {
    clearAdminSessionCookie(response);
  }

  return response;
}
