'use server';

import { redirect } from 'next/navigation';
import { requireUserId } from '@/server/auth/session';
import { selectPlan, resolveJourneyStep, getJourneyRedirect } from '@/server/services/journey.service';
import { selectPlanSchema } from '@/server/validation/journey';

export async function selectPlanAction(_prev: unknown, formData: FormData) {
  const userId = await requireUserId();

  const parsed = selectPlanSchema.safeParse({
    plan: formData.get('plan'),
  });

  if (!parsed.success) {
    return { error: 'Pilihan paket tidak valid.' };
  }

  const result = await selectPlan(userId, parsed.data.plan);

  if (result.alreadyExists) {
    const step = await resolveJourneyStep(userId);
    redirect(getJourneyRedirect(step));
  }

  redirect('/onboarding');
}
