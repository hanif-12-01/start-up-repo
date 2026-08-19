'use server';

import { ensurePublicDemoAccount, PUBLIC_DEMO_EMAIL } from '@/server/services/public-demo-provisioning.service';

export async function prepareDemoLogin(email?: string): Promise<{ success: boolean }> {
  try {
    if (!email || email.trim().toLowerCase() === PUBLIC_DEMO_EMAIL) {
      await ensurePublicDemoAccount();
    }
    return { success: true };
  } catch (err) {
    console.error('[Login Server Action] Error ensuring demo account:', err);
    return { success: false };
  }
}
