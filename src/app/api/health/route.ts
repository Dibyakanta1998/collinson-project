import { NextResponse } from 'next/server';

import { getHealthStatus } from '@/server/health';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(getHealthStatus());
}
