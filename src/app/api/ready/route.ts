import { NextResponse } from 'next/server';

import { getReadyStatus } from '@/server/health';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(await getReadyStatus());
  } catch {
    return NextResponse.json(
      { service: 'claimlens-ai', status: 'not_ready' },
      { status: 503 },
    );
  }
}
