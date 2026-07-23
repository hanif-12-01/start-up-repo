'use server';

import { redirect } from 'next/navigation';
import { requireUserId } from '@/server/auth/session';
import { selectPlan, resolveJourneyStep, getJourneyRedirect, PlanTransitionForbiddenError } from '@/server/services/journey.service';
import { selectPlanSchema } from '@/server/validation/journey';

export async function selectPlanAction(_prev: unknown, formData: FormData) {
  const userId = await requireUserId();

  const parsed = selectPlanSchema.safeParse({
    plan: formData.get('plan'),
  });

  if (!parsed.success) {
    return { error: 'Pilihan paket tidak valid.' };
  }

  let result;
  try {
    result = await selectPlan(userId, parsed.data.plan);
  } catch (err) {
    if (err instanceof PlanTransitionForbiddenError) {
      return { error: 'Perubahan paket tidak diizinkan.' };
    }
    throw err;
  }

  if (result.alreadyExists) {
    const step = await resolveJourneyStep(userId);
    redirect(getJourneyRedirect(step));
  }

  redirect('/onboarding');
}
