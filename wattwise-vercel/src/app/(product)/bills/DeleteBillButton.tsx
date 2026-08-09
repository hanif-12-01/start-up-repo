'use client';

import { useRef, useState, useTransition } from 'react';
import { Trash2, TriangleAlert } from 'lucide-react';
import { deleteBillAction } from './actions';

interface DeleteBillButtonProps {
  billId: string;
  periodLabel: string;
}

export function DeleteBillButton({ billId, periodLabel }: DeleteBillButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const openModal = () => {
    setError(null);
    dialogRef.current?.showModal();
  };

  const closeModal = () => {
    setError(null);
    dialogRef.current?.close();
  };

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      const res = await deleteBillAction(billId);
      if (res.success) {
        closeModal();
      } else {
        setError(res.error || 'Gagal menghapus tagihan.');
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--danger-surface)] hover:text-[var(--danger)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
        title="Hapus tagihan"
        aria-label={`Hapus tagihan ${periodLabel}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <dialog
        ref={dialogRef}
        onCancel={closeModal}
        className="fixed inset-0 z-50 m-auto max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-6 text-[var(--foreground)] shadow-[var(--shadow-medium)] backdrop:bg-[var(--overlay)]"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--danger-surface)] text-[var(--danger)]">
              <TriangleAlert className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-[var(--foreground)]">
                Hapus tagihan {periodLabel}?
              </h3>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Data tagihan ini akan dihapus. Tindakan tidak dapat dibatalkan.
              </p>
            </div>
          </div>

          {error && (
            <div role="alert" className="rounded-lg border border-[var(--danger-border)] bg-[var(--danger-surface)] p-3 text-xs leading-relaxed text-[var(--danger)]">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row pt-2">
            <button
              type="button"
              disabled={isPending}
              onClick={closeModal}
              className="rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-muted)] disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={handleDelete}
              className="rounded-xl bg-[var(--danger)] px-4 py-2.5 text-sm font-bold text-white hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] disabled:opacity-50"
            >
              {isPending ? 'Menghapus...' : 'Hapus'}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
