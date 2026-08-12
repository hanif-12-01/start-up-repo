import { NextRequest, NextResponse } from 'next/server';
import { authorizeInternalAiRequest } from '@/server/services/internal-ai-auth.service';
import { getAiShadowMonitoringSummary } from '@/server/services/ai-shadow-monitoring.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!authorizeInternalAiRequest(request.headers.get('authorization'))) {
    return NextResponse.json({ status: 'UNAUTHORIZED' }, { status: 401 });
  }
  try {
    return NextResponse.json(await getAiShadowMonitoringSummary(), {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch {
    return NextResponse.json({ status: 'UNAVAILABLE' }, { status: 503 });
  }
}
