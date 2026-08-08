'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { requireUserId } from '@/server/auth/session';
import { updateUserPreferences, updateUserProfile } from '@/server/services/workspace.service';
import { getDb } from '@/server/db/client';
import { user } from '@/server/db/schema';
import { eq } from 'drizzle-orm';

export async function updateProfileAction(formData: FormData) {
  const userId = await requireUserId();
  const name = String(formData.get('name') ?? '').trim();
  if (name.length < 2 || name.length > 100) throw new Error('Nama tidak valid');
  await updateUserProfile(userId, name);
  revalidatePath('/settings/profile');
  redirect('/settings/profile?saved=1');
}

export async function updatePreferencesAction(formData: FormData) {
  const userId = await requireUserId();
  const appearance = String(formData.get('appearance') ?? 'SYSTEM');
  if (!['SYSTEM', 'LIGHT', 'DARK'].includes(appearance)) throw new Error('Appearance is invalid');
  await updateUserPreferences(userId, {
    billAlerts: formData.get('billAlerts') === 'on',
    monthlyDigest: formData.get('monthlyDigest') === 'on',
    actionReminders: formData.get('actionReminders') === 'on',
    appearance,
  });
  revalidatePath('/settings/notifications');
  redirect('/settings/notifications?saved=1');
}

export async function updateAppearanceAction(formData: FormData) {
  const userId = await requireUserId();
  const appearance = String(formData.get('appearance') ?? 'SYSTEM');
  if (!['SYSTEM', 'LIGHT', 'DARK'].includes(appearance)) throw new Error('Appearance is invalid');
  await updateUserPreferences(userId, {
    billAlerts: formData.get('billAlerts') !== 'false',
    monthlyDigest: formData.get('monthlyDigest') !== 'false',
    actionReminders: formData.get('actionReminders') !== 'false',
    appearance,
  });
  const cookieStore = await cookies();
  cookieStore.set('ww-theme', appearance, {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath('/settings/appearance');
  redirect('/settings/appearance?saved=1');
}

export async function deleteAccountAction(formData: FormData) {
  const userId = await requireUserId();
  const confirmation = String(formData.get('confirmation') ?? '');
  if (confirmation !== 'HAPUS AKUN') redirect('/settings/profile?delete=invalid');
  await getDb().delete(user).where(eq(user.id, userId));
  const cookieStore = await cookies();
  for (const item of cookieStore.getAll()) {
    if (item.name.toLowerCase().includes('session')) cookieStore.delete(item.name);
  }
  redirect('/?accountDeleted=1');
}
