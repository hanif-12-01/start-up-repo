'use server';

import { redirect } from 'next/navigation';
import { requireUserId } from '@/server/auth/session';
import { completeOnboarding, resolveJourneyStep, getJourneyRedirect } from '@/server/services/journey.service';

export async function completeOnboardingAction() {
  const userId = await requireUserId();

  const ok = await completeOnboarding(userId);
  if (!ok) redirect('/plan');

  const step = await resolveJourneyStep(userId);
  redirect(getJourneyRedirect(step));
}
