'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { createRecordAction } from './actions';
import { primaryButton } from '@/components/product/WorkspaceUI';

const controlClass =
  'w-full min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-2 focus:outline-[var(--focus-ring)]';

interface ProcessOption {
  id: string;
  name: string;
  outputUnit: string;
}

export function ProductionForm({
  businessId,
  processes,
}: {
  businessId: string;
  processes: ProcessOption[];
}) {
  const [state, formAction, isPending] = useActionState(createRecordAction, {});
  const alertRef = useRef<HTMLDivElement>(null);
  const [selectedProcessId, setSelectedProcessId] = useState(processes[0]?.id ?? '');

  useEffect(() => {
    if (state.error && alertRef.current) {
      alertRef.current.focus();
    }
  }, [state]);

  const activeProcess = processes.find((p) => p.id === selectedProcessId);
  const issue = (path: string) => state.issues?.find((i) => i.path === path)?.message;

  if (!processes.length) {
    return (
      <div className="rounded-xl border border-[var(--border)] p-4 text-sm text-[var(--muted)]">
        Belum ada jenis aktivitas usaha. Daftarkan jenis aktivitas terlebih dahulu di bawah untuk mulai mencatat hasil produksi.
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-3 space-y-4 rounded-xl border border-[var(--border)] p-4 sm:p-5">
      <input type="hidden" name="businessId" value={businessId} />

      {state.error && (
        <div
          ref={alertRef}
          tabIndex={-1}
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400 focus:outline-none"
        >
          <strong>Gagal menyimpan catatan:</strong>
          <p className="mt-1">{state.error}</p>
        </div>
      )}

      {state.success && (
        <div role="status" className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-300">
          {state.success}
        </div>
      )}

      <div>
        <label htmlFor="record-process" className="block text-sm font-semibold text-[var(--foreground)]">
          Pilih jenis aktivitas
        </label>
        <select
          id="record-process"
          name="operationalProcessId"
          value={selectedProcessId}
          onChange={(e) => setSelectedProcessId(e.target.value)}
          required
          className={controlClass}
        >
          {processes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} (Satuan: {p.outputUnit})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="record-start" className="block text-sm font-semibold text-[var(--foreground)]">
            Waktu mulai periode
          </label>
          <input
            id="record-start"
            name="periodStart"
            type="datetime-local"
            required
            className={controlClass}
            aria-invalid={!!issue('periodStart')}
            aria-describedby={issue('periodStart') ? 'record-start-error' : undefined}
          />
          {issue('periodStart') && (
            <p id="record-start-error" className="mt-1 text-xs font-semibold text-red-600 dark:text-red-400">
              {issue('periodStart')}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="record-end" className="block text-sm font-semibold text-[var(--foreground)]">
            Waktu selesai periode
          </label>
          <input
            id="record-end"
            name="periodEnd"
            type="datetime-local"
            required
            className={controlClass}
            aria-invalid={!!issue('periodEnd')}
            aria-describedby={issue('periodEnd') ? 'record-end-error' : undefined}
          />
          {issue('periodEnd') && (
            <p id="record-end-error" className="mt-1 text-xs font-semibold text-red-600 dark:text-red-400">
              {issue('periodEnd')}
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="record-quantity" className="block text-sm font-semibold text-[var(--foreground)]">
          Jumlah hasil yang diproses ({activeProcess?.outputUnit ?? 'satuan'})
        </label>
        <div className="relative mt-1">
          <input
            id="record-quantity"
            name="outputQuantity"
            type="text"
            inputMode="decimal"
            required
            placeholder="Contoh: 150 atau 150.5"
            className={`${controlClass} pr-16`}
            aria-invalid={!!issue('outputQuantity')}
            aria-describedby={issue('outputQuantity') ? 'record-quantity-error' : 'record-quantity-help'}
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-bold text-[var(--muted)]">
            {activeProcess?.outputUnit}
          </span>
        </div>
        <p id="record-quantity-help" className="mt-1 text-xs text-[var(--muted)]">
          Total hasil kegiatan dalam rentang waktu tersebut. Gunakan titik untuk desimal.
        </p>
        {issue('outputQuantity') && (
          <p id="record-quantity-error" className="mt-1 text-xs font-semibold text-red-600 dark:text-red-400">
            {issue('outputQuantity')}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="record-notes" className="block text-sm font-semibold text-[var(--foreground)]">
          Catatan operasional (opsional)
        </label>
        <input
          id="record-notes"
          name="notes"
          type="text"
          maxLength={1000}
          placeholder="Misal: Operasional normal shift pagi"
          className={controlClass}
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className={`${primaryButton} min-h-11 w-full justify-center text-center sm:w-auto`}
      >
        {isPending ? 'Menyimpan...' : 'Simpan Catatan Produksi'}
      </button>
    </form>
  );
}
