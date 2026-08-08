'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { InteractiveMotion } from '@/components/motion/InteractiveMotion';
import { Reveal } from '@/components/motion/Reveal';
import type { BillRecord } from '@/server/repositories/bill.repository';
import { updateBillAction } from '../../actions';

const inputClass =
  'w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50';
const labelClass = 'mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-300';

export function BillEditForm({ bill }: { bill: BillRecord }) {
  const updateActionWithId = updateBillAction.bind(null, bill.id);
  const [state, formAction, isPending] = useActionState(updateActionWithId, null);

  const fieldError = (name: string) => state?.fieldErrors?.[name];
  const previousValue = (name: string, fallback: string = '') =>
    state?.values?.[name] ?? fallback;

  return (
    <>
      {state?.error && (
        <Reveal direction="up" duration={0.2}>
          <div role="alert" className="rounded-md border border-rose-800 bg-rose-950/80 p-3 text-xs leading-relaxed text-rose-200">
            {state.error}
          </div>
        </Reveal>
      )}

      <form action={formAction} className="space-y-5">
        <fieldset disabled={isPending} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="periodStart" className={labelClass}>
                Awal periode <span className="text-red-400">*</span>
              </label>
              <input
                id="periodStart"
                name="periodStart"
                type="date"
                required
                defaultValue={previousValue('periodStart', bill.periodStart)}
                className={inputClass}
              />
              {fieldError('periodStart') && <p className="mt-1 text-xs text-red-400">{fieldError('periodStart')}</p>}
            </div>
            <div>
              <label htmlFor="periodEnd" className={labelClass}>
                Akhir periode <span className="text-red-400">*</span>
              </label>
              <input
                id="periodEnd"
                name="periodEnd"
                type="date"
                required
                defaultValue={previousValue('periodEnd', bill.periodEnd)}
                className={inputClass}
              />
              {fieldError('periodEnd') && <p className="mt-1 text-xs text-red-400">{fieldError('periodEnd')}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="totalAmountRupiah" className={labelClass}>
              Total tagihan (Rupiah) <span className="text-red-400">*</span>
            </label>
            <input
              id="totalAmountRupiah"
              name="totalAmountRupiah"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              required
              defaultValue={previousValue('totalAmountRupiah', String(bill.totalAmountRupiah))}
              className={inputClass}
            />
            {fieldError('totalAmountRupiah') && (
              <p className="mt-1 text-xs text-red-400">{fieldError('totalAmountRupiah')}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="kwh" className={labelClass}>
                Pemakaian kWh
              </label>
              <input
                id="kwh"
                name="kwh"
                type="number"
                min="0"
                step="0.001"
                defaultValue={previousValue('kwh', bill.kwh ?? '')}
                className={inputClass}
              />
              {fieldError('kwh') && <p className="mt-1 text-xs text-red-400">{fieldError('kwh')}</p>}
            </div>
            <div>
              <label htmlFor="tariffRupiahPerKwh" className={labelClass}>
                Tarif Rupiah per kWh
              </label>
              <input
                id="tariffRupiahPerKwh"
                name="tariffRupiahPerKwh"
                type="number"
                min="0"
                step="0.01"
                defaultValue={previousValue('tariffRupiahPerKwh', bill.tariffRupiahPerKwh ?? '')}
                className={inputClass}
              />
              {fieldError('tariffRupiahPerKwh') && (
                <p className="mt-1 text-xs text-red-400">{fieldError('tariffRupiahPerKwh')}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="meterStart" className={labelClass}>
                Meter awal
              </label>
              <input
                id="meterStart"
                name="meterStart"
                type="number"
                min="0"
                step="0.001"
                defaultValue={previousValue('meterStart', bill.meterStart ?? '')}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="meterEnd" className={labelClass}>
                Meter akhir
              </label>
              <input
                id="meterEnd"
                name="meterEnd"
                type="number"
                min="0"
                step="0.001"
                defaultValue={previousValue('meterEnd', bill.meterEnd ?? '')}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="paymentMethod" className={labelClass}>
              Metode pembayaran
            </label>
            <select
              id="paymentMethod"
              name="paymentMethod"
              defaultValue={previousValue('paymentMethod', bill.paymentMethod ?? '')}
              className={inputClass}
            >
              <option value="">Tidak diisi</option>
              <option value="POSTPAID">Pascabayar</option>
              <option value="PREPAID">Token/prabayar</option>
              <option value="OTHER">Lainnya</option>
            </select>
          </div>

          <div>
            <label htmlFor="notes" className={labelClass}>
              Catatan
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              maxLength={1000}
              defaultValue={previousValue('notes', bill.notes ?? '')}
              className={inputClass}
            />
            {fieldError('notes') && <p className="mt-1 text-xs text-red-400">{fieldError('notes')}</p>}
          </div>
        </fieldset>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href={`/bills?businessId=${encodeURIComponent(bill.businessId)}`}
            className="rounded-md border border-slate-600 px-4 py-2.5 text-center text-sm font-semibold text-slate-200 hover:bg-slate-700"
          >
            Batal
          </Link>
          <InteractiveMotion>
            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-md bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-50 sm:w-auto"
            >
              {isPending ? 'Simpan...' : 'Simpan Perubahan'}
            </button>
          </InteractiveMotion>
        </div>
      </form>
    </>
  );
}
