'use client';

import { useActionState } from 'react';
import { evaluateActionOutcomeAction } from '../../../actions';

export function EvaluateOutcomeForm({ actionPlanId }: { actionPlanId: string }) {
  const [state, action, pending] = useActionState(evaluateActionOutcomeAction, null);
  return (
    <form action={action}>
      <input type="hidden" name="actionPlanId" value={actionPlanId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-300 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? 'Mengevaluasi…' : 'Evaluasi Hasil'}
      </button>
      <p className="mt-2 text-sm text-rose-300" aria-live="polite">
        {state?.error}
      </p>
    </form>
  );
}
