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
            ? 'rounded-md border border-rose-700 px-4 py-2.5 text-sm font-semibold text-rose-200 hover:bg-rose-950/40 focus:outline-2 focus:outline-offset-2 focus:outline-rose-300 disabled:cursor-wait disabled:opacity-60'
            : 'rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-300 disabled:cursor-wait disabled:opacity-60'
        }
      >
        {pending ? 'Menyimpan…' : label}
      </button>
      <p className="mt-2 text-sm text-rose-300" aria-live="polite">{state?.error}</p>
    </form>
  );
}
