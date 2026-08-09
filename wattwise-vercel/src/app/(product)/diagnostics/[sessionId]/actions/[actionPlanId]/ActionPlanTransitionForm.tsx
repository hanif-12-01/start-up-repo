'use client';

import { useActionState } from 'react';
import {
  cancelActionPlanAction,
  completeActionPlanAction,
  startActionPlanAction,
} from '../../../actions';

export function ActionPlanTransitionForm({
  sessionId,
  actionPlanId,
  transition,
}: {
  sessionId: string;
  actionPlanId: string;
  transition: 'START' | 'COMPLETE' | 'CANCEL';
}) {
  const serverAction =
    transition === 'START'
      ? startActionPlanAction
      : transition === 'COMPLETE'
        ? completeActionPlanAction
        : cancelActionPlanAction;
  const [state, action, pending] = useActionState(serverAction, null);
  const label =
    transition === 'START'
      ? 'Mulai tindakan'
      : transition === 'COMPLETE'
        ? 'Tandai tindakan selesai'
        : 'Batalkan rencana';
  return (
    <form action={action}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="actionPlanId" value={actionPlanId} />
      <button
        type="submit"
        disabled={pending}
        className={
          transition === 'CANCEL'
            ? 'rounded-md border border-[var(--danger-border)] px-4 py-2.5 text-sm font-semibold text-[var(--danger)] hover:bg-[var(--danger-surface)]/40 focus:outline-2 focus:outline-offset-2 focus:outline-[var(--danger)] disabled:cursor-wait disabled:opacity-60'
            : 'rounded-md bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--focus-ring)] disabled:cursor-wait disabled:opacity-60'
        }
      >
        {pending ? 'Menyimpan…' : label}
      </button>
      <p className="mt-2 text-sm text-[var(--danger)]" aria-live="polite">{state?.error}</p>
    </form>
  );
}
