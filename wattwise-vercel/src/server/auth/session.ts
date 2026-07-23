import { headers } from 'next/headers';
import { auth } from './index';

export type SessionResult = Awaited<ReturnType<typeof auth.api.getSession>>;

export async function getOptionalSession(reqHeaders?: Headers): Promise<SessionResult | null> {
  try {
    const h = reqHeaders ?? (await headers());
    const res = await auth.api.getSession({
      headers: h,
    });
    if (!res || !res.session || !res.user) {
      return null;
    }
    return res;
  } catch (err: unknown) {
    if (
      err &&
      typeof err === 'object' &&
      'digest' in err &&
      typeof (err as { digest: unknown }).digest === 'string' &&
      ((err as { digest: string }).digest.startsWith('NEXT_REDIRECT') ||
        (err as { digest: string }).digest.startsWith('NEXT_NOT_FOUND'))
    ) {
      throw err;
    }
    return null;
  }
}

export async function requireSession(reqHeaders?: Headers) {
  const sessionResult = await getOptionalSession(reqHeaders);
  if (!sessionResult || !sessionResult.session || !sessionResult.user) {
    throw new Error('UNAUTHENTICATED');
  }
  return sessionResult;
}

export async function requireUserId(reqHeaders?: Headers): Promise<string> {
  const { user } = await requireSession(reqHeaders);
  if (!user || !user.id) {
    throw new Error('UNAUTHENTICATED');
  }
  return user.id;
}
