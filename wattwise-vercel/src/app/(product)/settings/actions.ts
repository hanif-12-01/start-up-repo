'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUserId } from '@/server/auth/session';
import { updateUserPreferences, updateUserProfile } from '@/server/services/workspace.service';

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
  revalidatePath('/settings/appearance');
  redirect('/settings/appearance?saved=1');
}
