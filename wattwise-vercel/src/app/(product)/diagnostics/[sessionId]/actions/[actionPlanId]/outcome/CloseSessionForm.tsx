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
        className="rounded-md bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 focus:outline-2 focus:outline-offset-2 focus:outline-cyan-300 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? 'Menutup sesi…' : 'Tutup Sesi Cek Kenaikan'}
      </button>
      <p className="mt-2 text-sm text-rose-300" aria-live="polite">
        {state?.error}
      </p>
    </form>
  );
}
