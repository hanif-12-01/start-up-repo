'use client';

import { useActionState } from 'react';
import { selectPlanAction } from './actions';

export function PlanChoiceForm() {
  const [state, formAction, isPending] = useActionState(selectPlanAction, null);

  return (
    <div className="space-y-4">
      {state?.error && (
        <div role="alert" className="p-3 bg-red-950/80 border border-red-800 rounded-md text-sm text-red-200">
          {state.error}
        </div>
      )}

      <form action={formAction}>
        <input type="hidden" name="plan" value="FREE" />
        <button
          type="submit"
          disabled={isPending}
          className="w-full p-4 bg-slate-900 border-2 border-slate-600 hover:border-emerald-500 rounded-lg text-left transition focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
        >
          <span className="block text-lg font-semibold text-slate-100">Gratis</span>
          <span className="block text-sm text-slate-400 mt-1">
            1 lokasi usaha, pencatatan dasar, dan pratinjau diagnosis.
          </span>
        </button>
      </form>

      <form action={formAction}>
        <input type="hidden" name="plan" value="PRO_TRIAL" />
        <button
          type="submit"
          disabled={isPending}
          className="w-full p-4 bg-emerald-950/40 border-2 border-emerald-700/60 hover:border-emerald-400 rounded-lg text-left transition focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
        >
          <span className="block text-lg font-semibold text-emerald-400">Pro Trial — 30 Hari</span>
          <span className="block text-sm text-slate-400 mt-1">
            Fitur lengkap diagnosis, rencana hemat, dan laporan. Tanpa biaya, tanpa kartu kredit.
          </span>
          <span className="block text-xs text-slate-500 mt-2">
            Trial hanya dapat digunakan satu kali dan tidak dapat diperpanjang.
          </span>
        </button>
      </form>
    </div>
  );
}
