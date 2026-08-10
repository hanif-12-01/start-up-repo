'use client';

import { useActionState } from 'react';
import type { InspectionAnswerCode } from '@/server/db/schema/inspections';
import { INSPECTION_ANSWER_LABELS } from '@/server/services/inspection-presentation';
import { answerInspectionItemAction } from '../../../actions';

export function InspectionItemForm({
  sessionId,
  planId,
  itemId,
  resultOptions,
  initialAnswer,
  initialNote,
}: {
  sessionId: string;
  planId: string;
  itemId: string;
  resultOptions: InspectionAnswerCode[];
  initialAnswer: InspectionAnswerCode | null;
  initialNote: string | null;
}) {
  const [state, action, pending] = useActionState(
    answerInspectionItemAction,
    null
  );

  return (
    <form action={action} className="mt-5 space-y-4">
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="planId" value={planId} />
      <input type="hidden" name="itemId" value={itemId} />
      <fieldset disabled={pending}>
        <legend className="text-sm font-semibold text-[var(--foreground)]">
          Hasil pengamatan
        </legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {resultOptions.map((option) => (
            <label
              key={option}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)]/50 px-4 py-3 text-sm text-[var(--foreground)] hover:border-[var(--info-border)]"
            >
              <input
                type="radio"
                name="answerCode"
                value={option}
                required
                defaultChecked={initialAnswer === option}
                className="size-4 accent-[var(--info)]"
              />
              {INSPECTION_ANSWER_LABELS[option]}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block text-sm font-semibold text-[var(--foreground)]">
        Catatan opsional
        <textarea
          name="note"
          maxLength={1000}
          defaultValue={initialNote ?? ''}
          disabled={pending}
          rows={3}
          placeholder="Catat hanya yang terlihat atau sudah diketahui."
          className="mt-2 block w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--info)] disabled:opacity-60"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--focus-ring)] disabled:cursor-wait disabled:opacity-60"
      >
        {pending
          ? 'Menyimpan…'
          : initialAnswer
            ? 'Perbarui jawaban'
            : 'Simpan jawaban'}
      </button>
      <p className="text-sm text-[var(--danger)]" aria-live="polite">
        {state?.error}
      </p>
    </form>
  );
}
