'use client';

import { useActionState } from 'react';
import { startDiagnosticAction } from './actions';

export function StartDiagnosticButton({
  electricityBillId,
  resumable,
}: {
  electricityBillId: string;
  resumable: boolean;
}) {
  const [state, action, pending] = useActionState(startDiagnosticAction, null);

  return (
    <form action={action} className="mt-5">
      <input type="hidden" name="electricityBillId" value={electricityBillId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-wait disabled:opacity-60"
      >
        {pending
          ? 'Membuka pemeriksaan…'
          : resumable
            ? 'Lanjutkan Cek Kenaikan'
            : 'Cek Kenaikan'}
      </button>
      <p className="mt-2 text-sm text-rose-300" aria-live="polite">
        {state?.error}
      </p>
    </form>
  );
}
