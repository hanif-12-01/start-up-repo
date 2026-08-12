import { NextRequest, NextResponse } from 'next/server';
import { authorizeInternalAiRequest } from '@/server/services/internal-ai-auth.service';
import { processShadowBatch } from '@/server/services/ai-shadow-operations.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!authorizeInternalAiRequest(request.headers.get('authorization'))) {
    return NextResponse.json({ status: 'UNAUTHORIZED' }, { status: 401 });
  }
  try {
    const result = await processShadowBatch();
    return NextResponse.json({ status: 'OK', ...result }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch {
    return NextResponse.json({ status: 'UNAVAILABLE' }, { status: 503 });
  }
}
