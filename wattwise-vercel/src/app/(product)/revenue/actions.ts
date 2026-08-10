'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUserId } from '@/server/auth/session';
import { saveRevenueEntry } from '@/server/services/workspace.service';

export async function saveRevenueAction(formData: FormData) {
  const userId = await requireUserId();
  const businessId = String(formData.get('businessId') ?? '');
  const month = String(formData.get('month') ?? '');
  const rawAmount = String(formData.get('amount') ?? '').replace(/[^0-9]/g, '');
  const inputMode = String(formData.get('inputMode') ?? 'EXACT');
  const notes = String(formData.get('notes') ?? '').trim();
  if (!businessId || !/^\d{4}-\d{2}$/.test(month) || !rawAmount || !['EXACT', 'ESTIMATE'].includes(inputMode)) {
    throw new Error('Data pendapatan tidak valid');
  }
  await saveRevenueEntry(userId, {
    businessId,
    periodMonth: `${month}-01`,
    amountRupiah: BigInt(rawAmount),
    inputMode,
    notes: notes || null,
  });
  revalidatePath('/revenue');
  revalidatePath('/dashboard');
  redirect(`/revenue?businessId=${encodeURIComponent(businessId)}&saved=1`);
}

export async function deleteRevenueAction(formData: FormData) {
  const userId = await requireUserId();
  const revenueId = String(formData.get('revenueId') ?? '');
  if (!revenueId) throw new Error('ID Pendapatan tidak valid');
  const { deleteRevenueEntry } = await import('@/server/services/workspace.service');
  const businessId = await deleteRevenueEntry(userId, revenueId);
  revalidatePath('/revenue');
  revalidatePath('/dashboard');
  redirect(`/revenue?businessId=${encodeURIComponent(businessId)}&deleted=1`);
}
