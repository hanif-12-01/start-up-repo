import { notFound, redirect } from 'next/navigation';
import { getOptionalSession } from '@/server/auth/session';
import { getJourneyRedirect, resolveJourneyStep } from '@/server/services/journey.service';
import {
  getWorkspaceContext,
  WorkspaceBusinessNotFoundError,
  WorkspaceUnavailableError,
} from '@/server/services/workspace.service';

export async function requireWorkspacePage(requestedBusinessId?: string) {
  const session = await getOptionalSession();
  if (!session?.user) redirect('/login');
  const userId = session.user.id;
  const step = await resolveJourneyStep(userId);
  if (step !== 'COMPLETE') redirect(getJourneyRedirect(step));
  try {
    const context = await getWorkspaceContext(userId, requestedBusinessId);
    return { userId, user: session.user, ...context };
  } catch (error) {
    if (error instanceof WorkspaceUnavailableError) redirect('/businesses/new');
    if (error instanceof WorkspaceBusinessNotFoundError) notFound();
    throw error;
  }
}

export async function readRequestedBusiness(searchParams: Promise<{ businessId?: string | string[] }>) {
  const query = await searchParams;
  if (Array.isArray(query.businessId)) notFound();
  return typeof query.businessId === 'string' && query.businessId.trim()
    ? query.businessId
    : undefined;
}
