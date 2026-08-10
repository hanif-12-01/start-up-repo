'use client';

import { useActionState } from 'react';
import { completeInspectionAction } from '../../../actions';

export function CompleteInspectionForm({
  sessionId,
  planId,
}: {
  sessionId: string;
  planId: string;
}) {
  const [state, action, pending] = useActionState(
    completeInspectionAction,
    null
  );

  return (
    <form action={action}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="planId" value={planId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--focus-ring)] disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? 'Menyelesaikan…' : 'Selesaikan pemeriksaan'}
      </button>
      <p className="mt-3 text-sm text-[var(--danger)]" aria-live="polite">
        {state?.error}
      </p>
    </form>
  );
}
