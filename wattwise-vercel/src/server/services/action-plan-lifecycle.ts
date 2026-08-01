import type { ActionPlanStatus } from '@/server/db/schema/action-plans';

export type ActionPlanTransition = 'START' | 'COMPLETE' | 'CANCEL';

export function resolveActionPlanTransition(
  status: ActionPlanStatus,
  transition: ActionPlanTransition
): ActionPlanStatus {
  if (transition === 'START' && status === 'PLANNED') return 'IN_PROGRESS';
  if (transition === 'COMPLETE' && status === 'IN_PROGRESS') return 'COMPLETED';
  if (transition === 'CANCEL' && (status === 'PLANNED' || status === 'IN_PROGRESS')) {
    return 'CANCELLED';
  }
  if (
    (transition === 'START' && status === 'IN_PROGRESS') ||
    (transition === 'COMPLETE' && status === 'COMPLETED') ||
    (transition === 'CANCEL' && status === 'CANCELLED')
  ) {
    return status;
  }
  throw new Error(`Invalid action plan transition: ${status} -> ${transition}`);
}
