import { auth } from '@/server/auth';
import { toNextJsHandler } from 'better-auth/next-js';
import { ensurePublicDemoAccount, PUBLIC_DEMO_EMAIL, PUBLIC_DEMO_PASSWORD } from '@/server/services/public-demo-provisioning.service';

export const dynamic = 'force-dynamic';

const authHandlers = toNextJsHandler(auth);

export const GET = authHandlers.GET;

export const POST = async (request: Request) => {
  try {
    const url = new URL(request.url);
    if (url.pathname.endsWith('/sign-in/email')) {
      const clone = request.clone();
      const body = await clone.json().catch(() => null);
      if (
        body &&
        typeof body.email === 'string' &&
        body.email.trim().toLowerCase() === PUBLIC_DEMO_EMAIL &&
        body.password === PUBLIC_DEMO_PASSWORD
      ) {
        await ensurePublicDemoAccount();
      }
    }
  } catch (err) {
    console.error('[Auth API] Failed to check/ensure public demo account:', err);
  }

  return authHandlers.POST(request);
};

