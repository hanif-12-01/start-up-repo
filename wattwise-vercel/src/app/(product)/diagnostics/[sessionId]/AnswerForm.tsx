'use client';

import { useActionState } from 'react';
import { DIAGNOSTIC_ANSWER_OPTIONS } from '@/server/services/diagnostic-question-catalog';
import { answerDiagnosticAction } from '../actions';

export function AnswerForm({
  sessionId,
  questionCode,
  questionVersion,
}: {
  sessionId: string;
  questionCode: string;
  questionVersion: number;
}) {
  const [state, action, pending] = useActionState(answerDiagnosticAction, null);

  return (
    <form action={action} className="mt-6">
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="questionCode" value={questionCode} />
      <input type="hidden" name="questionVersion" value={questionVersion} />
      <div className="grid gap-3 sm:grid-cols-2" aria-describedby="answer-help">
        {DIAGNOSTIC_ANSWER_OPTIONS.map((option, index) => (
          <button
            key={option.code}
            type="submit"
            name="answerCode"
            value={option.code}
            autoFocus={index === 0}
            disabled={pending}
            className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-left text-sm font-semibold text-slate-100 hover:border-cyan-400 hover:bg-slate-700 focus:outline-2 focus:outline-offset-2 focus:outline-cyan-400 disabled:cursor-wait disabled:opacity-60"
          >
            {pending ? 'Menyimpan…' : option.label}
          </button>
        ))}
      </div>
      <p id="answer-help" className="mt-3 text-xs text-slate-500">
        Jawaban disimpan per langkah. Jawaban yang sudah tersimpan tidak dapat diubah dalam sesi ini.
      </p>
      <p className="mt-3 text-sm text-rose-300" aria-live="polite">
        {state?.error}
      </p>
    </form>
  );
}
