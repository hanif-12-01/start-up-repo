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
        className="rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-300 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? 'Menyelesaikan…' : 'Selesaikan pemeriksaan'}
      </button>
      <p className="mt-3 text-sm text-rose-300" aria-live="polite">
        {state?.error}
      </p>
    </form>
  );
}
