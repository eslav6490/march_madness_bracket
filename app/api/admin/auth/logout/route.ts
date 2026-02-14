import { NextResponse } from 'next/server';

import { AUTH_NO_STORE_HEADERS } from '@/lib/admin';
import { clearAdminSessionCookie } from '@/lib/admin-session';

export async function POST() {
  const response = NextResponse.json({ authenticated: false }, { status: 200, headers: AUTH_NO_STORE_HEADERS });
  clearAdminSessionCookie(response);
  return response;
}
