'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveBusinessId } from '@/services/business';
import { markAllNotificationsRead, markNotificationRead } from '@/services/notification';

export async function markNotificationReadAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return;
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await markNotificationRead(session.user.id, id);
  revalidatePath('/dashboard/notifikasi');
}

export async function markAllNotificationsReadAction() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return;
  const businessId = await getActiveBusinessId(session.user.id);
  await markAllNotificationsRead(session.user.id, businessId);
  revalidatePath('/dashboard/notifikasi');
  revalidatePath('/dashboard');
}
