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
        className="rounded-md bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] hover:bg-[var(--primary)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--focus-ring)] disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? 'Mengevaluasi…' : 'Evaluasi Hasil'}
      </button>
      <p className="mt-2 text-sm text-[var(--danger)]" aria-live="polite">
        {state?.error}
      </p>
    </form>
  );
}
