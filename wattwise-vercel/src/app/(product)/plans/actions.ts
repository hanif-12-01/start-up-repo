'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUserId } from '@/server/auth/session';
import { cancelSandboxSubscription, createSandboxCheckout, settleSandboxPayment, startProTrial, TrialAlreadyUsedError } from '@/server/services/plan.service';

export async function startTrialAction() {
  const userId = await requireUserId();
  try {
    await startProTrial(userId);
  } catch (error) {
    if (error instanceof TrialAlreadyUsedError) redirect('/plans?notice=trial-used');
    throw error;
  }
  revalidatePath('/plans');
  redirect('/plans?notice=trial-started');
}

export async function createCheckoutAction(formData: FormData) {
  const userId = await requireUserId();
  const planCode = String(formData.get('planCode') ?? '');
  if (planCode !== 'PRO' && planCode !== 'BUSINESS') throw new Error('Paket tidak valid');
  const key = String(formData.get('idempotencyKey') ?? '') || `${userId}_${planCode}_${Date.now()}`;
  const invoiceId = await createSandboxCheckout(userId, planCode, key);
  revalidatePath('/plans');
  redirect(`/plans?checkout=${encodeURIComponent(invoiceId)}`);
}

export async function settlePaymentAction(formData: FormData) {
  const userId = await requireUserId();
  const paymentId = String(formData.get('paymentId') ?? '');
  const outcome = String(formData.get('outcome') ?? '');
  if (!paymentId || !['success', 'failure', 'cancelled'].includes(outcome)) throw new Error('Simulasi tidak valid');
  await settleSandboxPayment(userId, paymentId, outcome as 'success' | 'failure' | 'cancelled');
  revalidatePath('/plans');
  redirect(`/plans?notice=${outcome}`);
}

export async function cancelSubscriptionAction() {
  const userId = await requireUserId();
  await cancelSandboxSubscription(userId);
  revalidatePath('/plans');
  redirect('/plans?notice=cancelled');
}
