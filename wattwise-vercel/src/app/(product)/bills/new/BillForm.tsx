'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { InteractiveMotion } from '@/components/motion/InteractiveMotion';
import { Reveal } from '@/components/motion/Reveal';
import { createBillAction } from './actions';

const inputClass =
  'w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50';
const labelClass = 'mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-300';

export function BillForm({ businessId }: { businessId: string }) {
  const [state, formAction, isPending] = useActionState(createBillAction, null);
  const fieldError = (name: string) => state?.fieldErrors?.[name];
  const previousValue = (name: string) => state?.values?.[name] ?? '';

  return (
    <>
      {state?.error && (
        <Reveal direction="up" duration={0.2}>
          <div role="alert" className="rounded-md border border-red-800 bg-red-950/80 p-3 text-sm text-red-200">
            {state.error}
          </div>
        </Reveal>
      )}

      <form action={formAction} className="space-y-5">
        <input type="hidden" name="businessId" value={businessId} />
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
                defaultValue={previousValue('periodStart')}
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
                defaultValue={previousValue('periodEnd')}
                className={inputClass}
              />
              {fieldError('periodEnd') && <p className="mt-1 text-xs text-red-400">{fieldError('periodEnd')}</p>}
            </div>
          </div>
          <p className="-mt-3 text-xs text-slate-500">
            Tanggal awal dan akhir dihitung inklusif. Periode tidak boleh bertumpang tindih dengan tagihan lain.
          </p>

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
              defaultValue={previousValue('totalAmountRupiah')}
              className={inputClass}
              placeholder="Contoh: 1250000"
              aria-describedby="amount-help"
            />
            <p id="amount-help" className="mt-1 text-xs text-slate-500">
              Masukkan angka saja tanpa Rp, titik, atau koma.
            </p>
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
                defaultValue={previousValue('kwh')}
                className={inputClass}
                placeholder="Opsional"
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
                defaultValue={previousValue('tariffRupiahPerKwh')}
                className={inputClass}
                placeholder="Opsional"
              />
              {fieldError('tariffRupiahPerKwh') && (
                <p className="mt-1 text-xs text-red-400">{fieldError('tariffRupiahPerKwh')}</p>
              )}
            </div>
          </div>
          <p className="-mt-3 text-xs text-slate-500">
            WattWise tidak menebak kWh atau tarif dari total tagihan. Kolom kosong akan tetap kosong.
          </p>

          <div>
            <label htmlFor="notes" className={labelClass}>
              Catatan
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              maxLength={1000}
              defaultValue={previousValue('notes')}
              className={inputClass}
              placeholder="Contoh: ada penyesuaian atau denda pada rincian tagihan"
            />
            {fieldError('notes') && <p className="mt-1 text-xs text-red-400">{fieldError('notes')}</p>}
          </div>
        </fieldset>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href={`/bills?businessId=${encodeURIComponent(businessId)}`}
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
              {isPending ? 'Menyimpan...' : 'Simpan Tagihan'}
            </button>
          </InteractiveMotion>
        </div>
      </form>
    </>
  );
}
