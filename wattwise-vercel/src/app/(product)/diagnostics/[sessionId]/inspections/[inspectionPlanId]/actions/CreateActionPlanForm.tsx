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
        <legend className="text-lg font-semibold text-[var(--foreground)]">Pilihan Tindakan</legend>
        {options.map((option, index) => (
          <label
            key={option.actionCode}
            className="block cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-5 hover:border-[var(--info-border)] has-[:checked]:border-[var(--info)] has-[:checked]:bg-[var(--info-surface)]/20"
          >
            <span className="flex items-start gap-3">
              <input
                type="radio"
                name="selectedActionCode"
                value={option.actionCode}
                defaultChecked={index === 0}
                required
                className="mt-1 size-4 accent-[var(--info)]"
              />
              <span>
                <span className="block font-semibold text-[var(--foreground)]">{option.title}</span>
                <span className="mt-2 block text-sm leading-relaxed text-[var(--foreground)]">
                  {option.description}
                </span>
                <span className="mt-3 block text-sm text-[var(--info)]">{option.reasonTemplate}</span>
                <span className="mt-4 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Pratinjau langkah aman
                </span>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-[var(--foreground)]">
                  {option.steps.map((step) => (
                    <li key={step.stepCode}>{step.instruction}</li>
                  ))}
                </ol>
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      <label className="block text-sm font-semibold text-[var(--foreground)]">
        Tanggal mulai yang direncanakan
        <input
          type="date"
          name="plannedStartDate"
          min={minimumDate}
          defaultValue={minimumDate}
          required
          disabled={pending}
          className="mt-2 block w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--info)] disabled:opacity-60"
        />
        <span className="mt-2 block text-xs font-normal text-[var(--muted)]">
          Tanggal tidak boleh sebelum akhir periode tagihan baseline.
        </span>
      </label>

      <label className="block text-sm font-semibold text-[var(--foreground)]">
        Catatan opsional
        <textarea
          name="userNote"
          maxLength={1000}
          rows={4}
          disabled={pending}
          placeholder="Tambahkan konteks operasional bila perlu."
          className="mt-2 block w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--info)] disabled:opacity-60"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--focus-ring)] disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? 'Membuat rencana…' : 'Buat Rencana Hemat'}
      </button>
      <p className="text-sm text-[var(--danger)]" aria-live="polite">{state?.error}</p>
    </form>
  );
}
