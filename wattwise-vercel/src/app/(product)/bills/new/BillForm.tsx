'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { InteractiveMotion } from '@/components/motion/InteractiveMotion';
import { Reveal } from '@/components/motion/Reveal';
import { createBillAction } from './actions';
import { MeterOcrInput } from './MeterOcrInput';
import { FirstBillGuide } from '@/components/onboarding/FirstBillGuide';
import {
  errorTextClass,
  fieldClass,
  helpTextClass,
  labelClass,
  primaryButton,
  secondaryButton,
} from '@/components/product/WorkspaceUI';

export function BillForm({
  businessId,
  previousMeterEnd,
  isFirstBill = false,
  isGuided = false,
}: {
  businessId: string;
  previousMeterEnd?: string | null;
  isFirstBill?: boolean;
  isGuided?: boolean;
}) {
  const [state, formAction, isPending] = useActionState(createBillAction, null);
  const [guidedActive, setGuidedActive] = useState<boolean>(isGuided);
  const fieldError = (name: string) => state?.fieldErrors?.[name];
  const previousValue = (name: string) => state?.values?.[name] ?? '';

  return (
    <>
      {isFirstBill && (
        <FirstBillGuide
          isActive={guidedActive}
          onDismiss={() => setGuidedActive(false)}
        />
      )}

      {isFirstBill && !guidedActive && (
        <div className="flex justify-end pb-2">
          <button
            type="button"
            onClick={() => setGuidedActive(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--primary)]/30 bg-[var(--primary-soft)]/50 px-3 py-1.5 text-xs font-bold text-[var(--primary)] hover:bg-[var(--primary-soft)] transition"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Panduan pengisian tagihan
          </button>
        </div>
      )}

      {state?.error && (
        <Reveal direction="up" duration={0.2}>
          <div role="alert" className="rounded-xl border border-[var(--danger-border)] bg-[var(--danger-surface)] p-3 text-sm text-[var(--danger)]">
            {state.error}
          </div>
        </Reveal>
      )}

      <form data-tour-id="bill-entry-form" action={formAction} className="space-y-5">
        <input type="hidden" name="businessId" value={businessId} />
        <input type="hidden" name="isFirstBill" value={isFirstBill ? '1' : '0'} />
        <fieldset disabled={isPending} className="space-y-6">
          {/* SEKSI 1: Tagihan bulan ini (Wajib diisi) */}
          <section className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]/30 p-4 sm:p-5">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--primary)]">Seksi 1</span>
                <h3 className="text-base font-extrabold text-[var(--foreground)]">Tagihan bulan ini</h3>
              </div>
              <span className="rounded-full bg-[var(--primary-soft)] border border-[var(--primary)]/30 px-2 py-0.5 text-[10px] font-black text-[var(--primary)]">
                Wajib diisi
              </span>
            </div>

            <div data-tour-id="bill-period" className="grid gap-4 sm:grid-cols-2">
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
            <p className="-mt-1 text-xs text-[var(--muted)]">
              Tanggal awal dan akhir dihitung inklusif. Periode tidak boleh bertumpang tindih dengan tagihan lain.
            </p>

            <div data-tour-id="bill-amount">
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
          </section>

          {/* SEKSI 2: Lengkapi data pemakaian jika tersedia (Opsional) */}
          <section className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]/30 p-4 sm:p-5">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--muted)]">Seksi 2</span>
                <h3 className="text-base font-extrabold text-[var(--foreground)]">Lengkapi data pemakaian jika tersedia</h3>
              </div>
              <span className="rounded-full bg-[var(--surface-muted)] border border-[var(--border)] px-2 py-0.5 text-[10px] font-bold text-[var(--muted)]">
                Opsional
              </span>
            </div>

            {/* Reassuring Guidance Callout */}
            <div className="rounded-xl border border-[var(--primary)]/30 bg-[var(--primary-soft)]/50 p-3.5 text-xs text-[var(--primary-dark)] dark:text-[var(--primary)]">
              <p className="font-extrabold">Belum tahu pemakaian kWh?</p>
              <p className="mt-1 leading-relaxed text-[var(--muted)]">
                Tagihan tetap dapat disimpan. WattWise masih dapat membaca tren biaya, tetapi analisis pemakaian akan terbatas sampai data kWh tersedia.
              </p>
            </div>

            <div data-tour-id="bill-kwh" className="grid gap-4 sm:grid-cols-2">
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
                  placeholder="Opsional (contoh: 350)"
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
                  placeholder="Opsional (contoh: 1444.70)"
                />
                {fieldError('tariffRupiahPerKwh') && (
                  <p className={errorTextClass}>{fieldError('tariffRupiahPerKwh')}</p>
                )}
              </div>
            </div>
            <p className="-mt-1 text-xs text-[var(--muted)]">
              WattWise tidak menebak kWh atau tarif dari total tagihan. Kolom kosong akan tetap kosong.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="meterStart" className={labelClass}>Meter awal</label>
                <input
                  id="meterStart"
                  name="meterStart"
                  type="number"
                  min="0"
                  step="0.001"
                  defaultValue={previousValue('meterStart') || previousMeterEnd || ''}
                  className={fieldClass}
                  placeholder="Opsional"
                />
                {fieldError('meterStart') && <p className={errorTextClass}>{fieldError('meterStart')}</p>}
              </div>
              <div>
                <label htmlFor="meterEnd" className={labelClass}>Meter akhir</label>
                <input
                  id="meterEnd"
                  name="meterEnd"
                  type="number"
                  min="0"
                  step="0.001"
                  defaultValue={previousValue('meterEnd')}
                  className={fieldClass}
                  placeholder="Opsional"
                />
                {fieldError('meterEnd') && <p className={errorTextClass}>{fieldError('meterEnd')}</p>}
              </div>
            </div>
            <p className="-mt-1 text-xs text-[var(--muted)]">
              Jika kWh kosong dan kedua meter diisi, pemakaian dihitung dari meter akhir - meter awal. Meter awal diisi dari catatan akhir terbaru jika tersedia.
            </p>
            <MeterOcrInput targetInputId="meterEnd" />
          </section>

          {/* SEKSI 3: Informasi tambahan (Opsional) */}
          <section className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]/30 p-4 sm:p-5">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--muted)]">Seksi 3</span>
                <h3 className="text-base font-extrabold text-[var(--foreground)]">Informasi tambahan</h3>
              </div>
              <span className="rounded-full bg-[var(--surface-muted)] border border-[var(--border)] px-2 py-0.5 text-[10px] font-bold text-[var(--muted)]">
                Opsional
              </span>
            </div>

            <div>
              <label htmlFor="paymentMethod" className={labelClass}>Metode pembayaran</label>
              <select
                id="paymentMethod"
                name="paymentMethod"
                defaultValue={previousValue('paymentMethod')}
                className={fieldClass}
              >
                <option value="">Tidak diisi</option>
                <option value="POSTPAID">Pascabayar</option>
                <option value="PREPAID">Token/prabayar</option>
                <option value="OTHER">Lainnya</option>
              </select>
            </div>

            <div>
              <label htmlFor="notes" className={labelClass}>Catatan</label>
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
          </section>
        </fieldset>

        <div data-tour-id="bill-submit" className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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
