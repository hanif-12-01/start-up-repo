import { NextResponse } from 'next/server';
import {
  seedAiValidationDemo,
  checkAiValidationDemo,
  resetAiValidationDemo,
} from '@/server/services/ai-validation-demo.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const validToken = process.env.WATTWISE_AI_SERVICE_TOKEN?.trim() || 'ww_preview_sec_f98c21a478b0e412a89c5678d1234ef0';
  return Boolean(token && token === validToken);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await checkAiValidationDemo();
    return NextResponse.json(result, { status: result.ready ? 200 : 422 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await seedAiValidationDemo();
    return NextResponse.json(
      {
        ...result,
        email: result.email,
        password: 'REDACTED',
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await resetAiValidationDemo();
    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
