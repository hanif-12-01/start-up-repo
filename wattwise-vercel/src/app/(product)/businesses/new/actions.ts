'use server';

import { redirect } from 'next/navigation';
import { requireUserId } from '@/server/auth/session';
import { resolveJourneyStep } from '@/server/services/journey.service';
import { createBusiness } from '@/server/services/business.service';
import { createBusinessSchema } from '@/server/validation/journey';
import { BusinessLimitExceededError } from '@/server/services/entitlement.service';

export async function createBusinessAction(_prev: unknown, formData: FormData) {
  const userId = await requireUserId();

  const step = await resolveJourneyStep(userId);
  if (step !== 'BUSINESS') redirect(step === 'COMPLETE' ? '/dashboard' : `/${step.toLowerCase()}`);

  const raw = {
    name: formData.get('name'),
    businessType: formData.get('businessType'),
    city: formData.get('city') || undefined,
    segment: formData.get('segment'),
    electricalSystem: formData.get('electricalSystem'),
    roomCount: formData.get('roomCount') ? Number(formData.get('roomCount')) : undefined,
  };

  const parsed = createBusinessSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? 'general';
      if (!errors[key]) errors[key] = issue.message;
    }
    return { error: 'Mohon periksa data yang dimasukkan.', fieldErrors: errors };
  }

  try {
    await createBusiness(userId, parsed.data);
  } catch (error) {
    if (error instanceof BusinessLimitExceededError) {
      return { error: error.message };
    }
    throw error;
  }

  redirect('/dashboard');
}
