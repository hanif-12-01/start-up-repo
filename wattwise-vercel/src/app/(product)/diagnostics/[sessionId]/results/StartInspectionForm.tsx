'use client';

import { useActionState } from 'react';
import { startInspectionAction } from '../../actions';

export function StartInspectionForm({ candidateId }: { candidateId: string }) {
  const [state, action, pending] = useActionState(startInspectionAction, null);

  return (
    <form action={action} className="mt-5">
      <input type="hidden" name="candidateId" value={candidateId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--focus-ring)] disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? 'Menyiapkan panduan…' : 'Mulai pemeriksaan aman'}
      </button>
      <p className="mt-3 text-sm text-[var(--danger)]" aria-live="polite">
        {state?.error}
      </p>
    </form>
  );
}
