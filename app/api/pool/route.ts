import { NextResponse } from 'next/server';

import { getDb } from '@/lib/db';
import { getPublicPoolData } from '@/lib/public-pool';

export async function GET() {
  const db = getDb();
  const data = await getPublicPoolData(db);
  return NextResponse.json(data);
}
