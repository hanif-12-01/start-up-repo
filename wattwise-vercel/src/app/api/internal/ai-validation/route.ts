import { NextResponse } from 'next/server';
import {
  isAuthorized,
  validateEnvironmentGuard,
  seedAiValidationDemo,
  checkAiValidationDemo,
  resetAiValidationDemo,
} from '@/server/services/ai-validation-demo.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized request.' }, { status: 401 });
  }

  const envGuard = validateEnvironmentGuard();
  if (!envGuard.allowed) {
    return NextResponse.json({ error: envGuard.reason ?? 'Environment forbidden.' }, { status: 403 });
  }

  try {
    const result = await checkAiValidationDemo();
    return NextResponse.json(result, { status: result.ready ? 200 : 422 });
  } catch {
    return NextResponse.json({ error: 'Internal error during validation check.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized request.' }, { status: 401 });
  }

  const envGuard = validateEnvironmentGuard();
  if (!envGuard.allowed) {
    return NextResponse.json({ error: envGuard.reason ?? 'Environment forbidden.' }, { status: 403 });
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
  } catch {
    return NextResponse.json({ error: 'Internal error during validation seed.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized request.' }, { status: 401 });
  }

  const envGuard = validateEnvironmentGuard();
  if (!envGuard.allowed) {
    return NextResponse.json({ error: envGuard.reason ?? 'Environment forbidden.' }, { status: 403 });
  }

  try {
    const result = await resetAiValidationDemo();
    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Internal error during validation reset.' }, { status: 500 });
  }
}
