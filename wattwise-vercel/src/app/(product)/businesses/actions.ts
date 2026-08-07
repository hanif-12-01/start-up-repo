'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUserId } from '@/server/auth/session';
import { getPortfolio, updateBusinessStatus } from '@/server/services/workspace.service';

export async function setBusinessStatusAction(formData: FormData) {
  const userId = await requireUserId();
  const businessId = String(formData.get('businessId') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!businessId || !['active', 'archived'].includes(status)) throw new Error('Invalid business update');
  if (status === 'archived') {
    const portfolio = await getPortfolio(userId);
    if (portfolio.filter((item) => item.isActive).length <= 1) {
      redirect('/businesses?notice=keep-one-active');
    }
  }
  await updateBusinessStatus(userId, businessId, status === 'active');
  revalidatePath('/businesses');
  revalidatePath('/dashboard');
  redirect('/businesses?updated=1');
}
