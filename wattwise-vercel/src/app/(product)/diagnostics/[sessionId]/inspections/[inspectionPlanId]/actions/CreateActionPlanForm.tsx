'use client';

import { useActionState } from 'react';
import type { ActionDefinition } from '@/server/services/action-plan-catalog';
import { createActionPlanAction } from '../../../../actions';

export function CreateActionPlanForm({
  sessionId,
  inspectionPlanId,
  options,
  minimumDate,
}: {
  sessionId: string;
  inspectionPlanId: string;
  options: ReadonlyArray<ActionDefinition>;
  minimumDate: string;
}) {
  const [state, action, pending] = useActionState(createActionPlanAction, null);
  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="inspectionPlanId" value={inspectionPlanId} />
      <fieldset disabled={pending} className="space-y-4">
        <legend className="text-lg font-semibold text-slate-100">Pilihan Tindakan</legend>
        {options.map((option, index) => (
          <label
            key={option.actionCode}
            className="block cursor-pointer rounded-xl border border-slate-700 bg-slate-800 p-5 hover:border-cyan-500 has-[:checked]:border-cyan-400 has-[:checked]:bg-cyan-950/20"
          >
            <span className="flex items-start gap-3">
              <input
                type="radio"
                name="selectedActionCode"
                value={option.actionCode}
                defaultChecked={index === 0}
                required
                className="mt-1 size-4 accent-cyan-500"
              />
              <span>
                <span className="block font-semibold text-slate-100">{option.title}</span>
                <span className="mt-2 block text-sm leading-relaxed text-slate-300">
                  {option.description}
                </span>
                <span className="mt-3 block text-sm text-cyan-200">{option.reasonTemplate}</span>
                <span className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Pratinjau langkah aman
                </span>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-300">
                  {option.steps.map((step) => (
                    <li key={step.stepCode}>{step.instruction}</li>
                  ))}
                </ol>
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      <label className="block text-sm font-semibold text-slate-200">
        Tanggal mulai yang direncanakan
        <input
          type="date"
          name="plannedStartDate"
          min={minimumDate}
          defaultValue={minimumDate}
          required
          disabled={pending}
          className="mt-2 block w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400 disabled:opacity-60"
        />
        <span className="mt-2 block text-xs font-normal text-slate-400">
          Tanggal tidak boleh sebelum akhir periode tagihan baseline.
        </span>
      </label>

      <label className="block text-sm font-semibold text-slate-200">
        Catatan opsional
        <textarea
          name="userNote"
          maxLength={1000}
          rows={4}
          disabled={pending}
          placeholder="Tambahkan konteks operasional bila perlu."
          className="mt-2 block w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400 disabled:opacity-60"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-300 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? 'Membuat rencana…' : 'Buat Rencana Hemat'}
      </button>
      <p className="text-sm text-rose-300" aria-live="polite">{state?.error}</p>
    </form>
  );
}
