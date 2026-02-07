import { NextResponse } from 'next/server';

export function requireAdmin(request: Request) {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) {
    return NextResponse.json({ error: 'Admin token not configured' }, { status: 500 });
  }

  const headerToken = request.headers.get('x-admin-token');
  if (headerToken !== adminToken) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return null;
}
