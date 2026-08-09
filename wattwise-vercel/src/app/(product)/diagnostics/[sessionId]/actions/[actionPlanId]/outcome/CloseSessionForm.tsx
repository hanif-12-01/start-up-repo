'use client';

import { useActionState } from 'react';
import { closeDiagnosticSessionAction } from '../../../../actions';

export function CloseSessionForm({ sessionId }: { sessionId: string }) {
  const [state, action, pending] = useActionState(closeDiagnosticSessionAction, null);
  return (
    <form action={action} className="mt-4">
      <input type="hidden" name="sessionId" value={sessionId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--focus-ring)] disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? 'Menutup sesi…' : 'Tutup Sesi Cek Kenaikan'}
      </button>
      <p className="mt-2 text-sm text-[var(--danger)]" aria-live="polite">
        {state?.error}
      </p>
    </form>
  );
}
