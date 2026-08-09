'use client';

import { useActionState } from 'react';
import { generateDiagnosticCandidatesAction } from '../actions';

export function GenerateCandidatesForm({ sessionId }: { sessionId: string }) {
  const [state, action, pending] = useActionState(
    generateDiagnosticCandidatesAction,
    null
  );

  return (
    <form action={action} className="mt-5">
      <input type="hidden" name="sessionId" value={sessionId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--focus-ring)] disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? 'Menyusun bagian yang perlu dicek…' : 'Lihat Bagian yang Perlu Dicek'}
      </button>
      <p className="mt-3 text-sm text-[var(--danger)]" aria-live="polite">
        {state?.error}
      </p>
    </form>
  );
}
