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
            className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface-muted)] px-4 py-3 text-left text-sm font-semibold text-[var(--foreground)] hover:border-[var(--info)] hover:bg-[var(--surface-strong)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--focus-ring)] disabled:cursor-wait disabled:opacity-60"
          >
            {pending ? 'Menyimpan…' : option.label}
          </button>
        ))}
      </div>
      <p id="answer-help" className="mt-3 text-xs text-[var(--muted)]">
        Jawaban disimpan per langkah. Jawaban yang sudah tersimpan tidak dapat diubah dalam sesi ini.
      </p>
      <p className="mt-3 text-sm text-[var(--danger)]" aria-live="polite">
        {state?.error}
      </p>
    </form>
  );
}
