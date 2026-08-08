'use client';

import { useRef, useState, useTransition } from 'react';
import { Trash2 } from 'lucide-react';
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
        className="rounded-lg p-2 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
        title="Hapus tagihan"
        aria-label={`Hapus tagihan ${periodLabel}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <dialog
        ref={dialogRef}
        onCancel={closeModal}
        className="backdrop:bg-slate-950/80 fixed inset-0 z-50 m-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-100 shadow-2xl"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/10 text-xl text-rose-400">
              ⚠️
            </span>
            <div>
              <h3 className="text-lg font-bold text-slate-100">
                Hapus tagihan {periodLabel}?
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Data tagihan ini akan dihapus. Tindakan tidak dapat dibatalkan.
              </p>
            </div>
          </div>

          {error && (
            <div role="alert" className="rounded-lg border border-rose-800 bg-rose-950/80 p-3 text-xs leading-relaxed text-rose-200">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row pt-2">
            <button
              type="button"
              disabled={isPending}
              onClick={closeModal}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={handleDelete}
              className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-400 disabled:opacity-50"
            >
              {isPending ? 'Menghapus...' : 'Hapus'}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
