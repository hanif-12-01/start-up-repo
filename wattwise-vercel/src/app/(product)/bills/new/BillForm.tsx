'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { InteractiveMotion } from '@/components/motion/InteractiveMotion';
import { Reveal } from '@/components/motion/Reveal';
import { createBillAction } from './actions';
import { MeterOcrInput } from './MeterOcrInput';
import {
  errorTextClass,
  fieldClass,
  helpTextClass,
  labelClass,
  primaryButton,
  secondaryButton,
} from '@/components/product/WorkspaceUI';

export function BillForm({ businessId, previousMeterEnd }: { businessId: string; previousMeterEnd?: string | null }) {
  const [state, formAction, isPending] = useActionState(createBillAction, null);
  const fieldError = (name: string) => state?.fieldErrors?.[name];
  const previousValue = (name: string) => state?.values?.[name] ?? '';

  return (
    <>
      {state?.error && (
        <Reveal direction="up" duration={0.2}>
          <div role="alert" className="rounded-xl border border-[var(--danger-border)] bg-[var(--danger-surface)] p-3 text-sm text-[var(--danger)]">
            {state.error}
          </div>
        </Reveal>
      )}

      <form data-tour-id="bill-entry-form" action={formAction} className="space-y-5">
        <input type="hidden" name="businessId" value={businessId} />
        <fieldset disabled={isPending} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="periodStart" className={labelClass}>
                Awal periode <span className="text-[var(--danger)]" aria-hidden="true">*</span>
              </label>
              <input
                id="periodStart"
                name="periodStart"
                type="date"
                required
                defaultValue={previousValue('periodStart')}
                className={fieldClass}
              />
              {fieldError('periodStart') && <p className={errorTextClass}>{fieldError('periodStart')}</p>}
            </div>
            <div>
              <label htmlFor="periodEnd" className={labelClass}>
                Akhir periode <span className="text-[var(--danger)]" aria-hidden="true">*</span>
              </label>
              <input
                id="periodEnd"
                name="periodEnd"
                type="date"
                required
                defaultValue={previousValue('periodEnd')}
                className={fieldClass}
              />
              {fieldError('periodEnd') && <p className={errorTextClass}>{fieldError('periodEnd')}</p>}
            </div>
          </div>
          <p className="-mt-3 text-xs text-[var(--muted)]">
            Tanggal awal dan akhir dihitung inklusif. Periode tidak boleh bertumpang tindih dengan tagihan lain.
          </p>

          <div>
            <label htmlFor="totalAmountRupiah" className={labelClass}>
              Total tagihan (Rupiah) <span className="text-[var(--danger)]" aria-hidden="true">*</span>
            </label>
            <input
              id="totalAmountRupiah"
              name="totalAmountRupiah"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              required
              defaultValue={previousValue('totalAmountRupiah')}
              className={fieldClass}
              placeholder="Contoh: 1250000"
              aria-describedby="amount-help"
            />
            <p id="amount-help" className={helpTextClass}>
              Masukkan angka saja tanpa Rp, titik, atau koma.
            </p>
            {fieldError('totalAmountRupiah') && (
              <p className={errorTextClass}>{fieldError('totalAmountRupiah')}</p>
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
                className={fieldClass}
                placeholder="Opsional"
              />
              {fieldError('kwh') && <p className={errorTextClass}>{fieldError('kwh')}</p>}
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
                className={fieldClass}
                placeholder="Opsional"
              />
              {fieldError('tariffRupiahPerKwh') && (
                <p className={errorTextClass}>{fieldError('tariffRupiahPerKwh')}</p>
              )}
            </div>
          </div>
          <p className="-mt-3 text-xs text-[var(--muted)]">
            WattWise tidak menebak kWh atau tarif dari total tagihan. Kolom kosong akan tetap kosong.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div><label htmlFor="meterStart" className={labelClass}>Meter awal</label><input id="meterStart" name="meterStart" type="number" min="0" step="0.001" defaultValue={previousValue('meterStart') || previousMeterEnd || ''} className={fieldClass} placeholder="Opsional"/>{fieldError('meterStart') && <p className={errorTextClass}>{fieldError('meterStart')}</p>}</div>
            <div><label htmlFor="meterEnd" className={labelClass}>Meter akhir</label><input id="meterEnd" name="meterEnd" type="number" min="0" step="0.001" defaultValue={previousValue('meterEnd')} className={fieldClass} placeholder="Opsional"/>{fieldError('meterEnd') && <p className={errorTextClass}>{fieldError('meterEnd')}</p>}</div>
          </div>
          <p className="-mt-3 text-xs text-[var(--muted)]">Jika kWh kosong dan kedua meter diisi, pemakaian dihitung dari meter akhir - meter awal. Meter awal diisi dari catatan akhir terbaru jika tersedia.</p>
          <MeterOcrInput targetInputId="meterEnd" />
          <div><label htmlFor="paymentMethod" className={labelClass}>Metode pembayaran</label><select id="paymentMethod" name="paymentMethod" defaultValue={previousValue('paymentMethod')} className={fieldClass}><option value="">Tidak diisi</option><option value="POSTPAID">Pascabayar</option><option value="PREPAID">Token/prabayar</option><option value="OTHER">Lainnya</option></select></div>

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
              className={fieldClass}
              placeholder="Contoh: ada penyesuaian atau denda pada rincian tagihan"
            />
            {fieldError('notes') && <p className={errorTextClass}>{fieldError('notes')}</p>}
          </div>
        </fieldset>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href={`/bills?businessId=${encodeURIComponent(businessId)}`}
            className={secondaryButton}
          >
            Batal
          </Link>
          <InteractiveMotion>
            <button
              type="submit"
              disabled={isPending}
              className={`${primaryButton} w-full sm:w-auto`}
            >
              {isPending ? 'Menyimpan...' : 'Simpan Tagihan'}
            </button>
          </InteractiveMotion>
        </div>
      </form>
    </>
  );
}
