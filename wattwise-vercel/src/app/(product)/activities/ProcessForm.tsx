'use client';

import { useActionState, useEffect, useRef } from 'react';
import { createProcessAction } from './actions';
import { primaryButton } from '@/components/product/WorkspaceUI';

const controlClass =
  'w-full min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-2 focus:outline-[var(--focus-ring)]';

export function ProcessForm({ businessId }: { businessId: string }) {
  const [state, formAction, isPending] = useActionState(createProcessAction, {});
  const alertRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (state.error && alertRef.current) {
      alertRef.current.focus();
    }
    if (state.success && detailsRef.current) {
      detailsRef.current.open = false;
    }
  }, [state]);

  const issue = (path: string) => state.issues?.find((i) => i.path === path)?.message;

  return (
    <details ref={detailsRef} className="mt-4 border-t border-[var(--border)] pt-4">
      <summary className="w-fit min-h-11 cursor-pointer rounded-lg py-2 font-bold text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]">
        + Tambah jenis aktivitas baru
      </summary>

      <form action={formAction} className="mt-4 space-y-4 rounded-xl border border-[var(--border)] p-4 sm:p-5">
        <input type="hidden" name="businessId" value={businessId} />

        {state.error && (
          <div
            ref={alertRef}
            tabIndex={-1}
            role="alert"
            className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400 focus:outline-none"
          >
            <strong>Gagal mendaftarkan aktivitas:</strong>
            <p className="mt-1">{state.error}</p>
          </div>
        )}

        {state.success && (
          <div role="status" className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-300">
            {state.success}
          </div>
        )}

        <div>
          <label htmlFor="process-name" className="block text-sm font-semibold text-[var(--foreground)]">
            Nama aktivitas usaha
          </label>
          <input
            id="process-name"
            name="name"
            type="text"
            required
            maxLength={120}
            placeholder="Contoh: Laundry pakaian kiloan, Produksi roti"
            className={controlClass}
            aria-invalid={!!issue('name')}
            aria-describedby={issue('name') ? 'process-name-error' : 'process-name-help'}
          />
          <p id="process-name-help" className="mt-1 text-xs text-[var(--muted)]">
            Nama kegiatan operasional yang menghasilkan produk atau jasa.
          </p>
          {issue('name') && (
            <p id="process-name-error" className="mt-1 text-xs font-semibold text-red-600 dark:text-red-400">
              {issue('name')}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="process-unit" className="block text-sm font-semibold text-[var(--foreground)]">
            Satuan hasil
          </label>
          <input
            id="process-unit"
            name="outputUnit"
            type="text"
            required
            maxLength={30}
            placeholder="Contoh: kg, pcs, porsi, liter"
            className={controlClass}
            aria-invalid={!!issue('outputUnit')}
            aria-describedby={issue('outputUnit') ? 'process-unit-error' : 'process-unit-help'}
          />
          <p id="process-unit-help" className="mt-1 text-xs text-[var(--muted)]">
            Satuan yang digunakan untuk menghitung hasil kegiatan (misal: kg untuk cucian, pcs untuk barang).
          </p>
          {issue('outputUnit') && (
            <p id="process-unit-error" className="mt-1 text-xs font-semibold text-red-600 dark:text-red-400">
              {issue('outputUnit')}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="process-desc" className="block text-sm font-semibold text-[var(--foreground)]">
            Keterangan (opsional)
          </label>
          <input
            id="process-desc"
            name="description"
            type="text"
            maxLength={1000}
            placeholder="Keterangan tambahan alur aktivitas"
            className={controlClass}
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className={`${primaryButton} min-h-11 w-full justify-center text-center sm:w-auto`}
        >
          {isPending ? 'Menyimpan...' : 'Simpan Jenis Aktivitas'}
        </button>
      </form>
    </details>
  );
}
