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
        <legend className="text-sm font-semibold text-slate-200">
          Hasil pengamatan
        </legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {resultOptions.map((option) => (
            <label
              key={option}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-600 bg-slate-900/50 px-4 py-3 text-sm text-slate-200 hover:border-cyan-500"
            >
              <input
                type="radio"
                name="answerCode"
                value={option}
                required
                defaultChecked={initialAnswer === option}
                className="size-4 accent-cyan-500"
              />
              {INSPECTION_ANSWER_LABELS[option]}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block text-sm font-semibold text-slate-200">
        Catatan opsional
        <textarea
          name="note"
          maxLength={1000}
          defaultValue={initialNote ?? ''}
          disabled={pending}
          rows={3}
          placeholder="Catat hanya yang terlihat atau sudah diketahui."
          className="mt-2 block w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400 disabled:opacity-60"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 focus:outline-2 focus:outline-offset-2 focus:outline-cyan-300 disabled:cursor-wait disabled:opacity-60"
      >
        {pending
          ? 'Menyimpan…'
          : initialAnswer
            ? 'Perbarui jawaban'
            : 'Simpan jawaban'}
      </button>
      <p className="text-sm text-rose-300" aria-live="polite">
        {state?.error}
      </p>
    </form>
  );
}
