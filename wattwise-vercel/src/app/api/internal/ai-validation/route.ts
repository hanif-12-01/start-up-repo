import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import {
  AI_VALIDATION_PREVIEW_PROJECT_ID,
  seedAiValidationDemo,
  checkAiValidationDemo,
  resetAiValidationDemo,
} from '@/server/services/ai-validation-demo.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function isAuthorized(request: Request, env: Record<string, string | undefined> = process.env): boolean {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const adminToken = env.AI_VALIDATION_ADMIN_TOKEN?.trim();

  // Fail closed unconditionally when admin token is not configured or empty
  if (!adminToken || !token) {
    return false;
  }

  const tokenBuffer = Buffer.from(token, 'utf-8');
  const adminBuffer = Buffer.from(adminToken, 'utf-8');
  if (tokenBuffer.length !== adminBuffer.length) {
    return false;
  }

  try {
    return timingSafeEqual(tokenBuffer, adminBuffer);
  } catch {
    return false;
  }
}

export function validateEnvironmentGuard(env: Record<string, string | undefined> = process.env): { allowed: boolean; reason?: string } {
  const vercelEnv = env.VERCEL_ENV;
  const qaDemoEnabled = env.QA_DEMO_ENABLED;
  const validationProfileEnabled = env.WATTWISE_AI_VALIDATION_PROFILE_ENABLED;
  const previewDbProjectId = env.WATTWISE_PREVIEW_DATABASE_PROJECT_ID;

  if (vercelEnv === 'production') {
    return { allowed: false, reason: 'AI validation route is strictly forbidden in Production.' };
  }

  if (vercelEnv !== 'preview') {
    return { allowed: false, reason: 'AI validation route is restricted strictly to Preview runtime.' };
  }

  if (qaDemoEnabled !== 'true') {
    return { allowed: false, reason: 'QA demo provisioning is disabled (QA_DEMO_ENABLED !== true).' };
  }

  if (validationProfileEnabled !== 'true') {
    return { allowed: false, reason: 'AI validation profile is disabled (WATTWISE_AI_VALIDATION_PROFILE_ENABLED !== true).' };
  }

  if (previewDbProjectId !== AI_VALIDATION_PREVIEW_PROJECT_ID) {
    return { allowed: false, reason: 'Preview database project ID mismatch.' };
  }

  return { allowed: true };
}

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
