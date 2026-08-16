'use client';

import { useActionState } from 'react';
import { createBusinessAction } from './actions';
import { Reveal } from '@/components/motion/Reveal';
import { InteractiveMotion } from '@/components/motion/InteractiveMotion';

const BUSINESS_TYPES = [
  { value: 'KOS_PROPERTY', label: 'Kos / Properti' },
  { value: 'FNB', label: 'F&B / Restoran' },
  { value: 'LAUNDRY', label: 'Laundry' },
  { value: 'RETAIL', label: 'Retail / Toko' },
  { value: 'COLD_STORAGE', label: 'Cold Storage' },
  { value: 'OTHER', label: 'Lainnya' },
];

const SEGMENTS = [
  { value: 'KOS', label: 'Kos' },
  { value: 'FNB', label: 'F&B' },
  { value: 'LAUNDRY', label: 'Laundry' },
  { value: 'RETAIL', label: 'Retail' },
  { value: 'COLD_STORAGE', label: 'Cold Storage' },
  { value: 'OTHER', label: 'Lainnya' },
];

const ELECTRICAL_SYSTEMS = [
  {
    value: 'ALL_IN',
    label: 'Listrik Ditanggung Pemilik',
  },
  {
    value: 'TOKEN_PER_KAMAR',
    label: 'Token per Kamar / Unit',
  },
  {
    value: 'SUB_METER',
    label: 'Sub-Meter per Kamar / Unit',
  },
  {
    value: 'PATUNGAN',
    label: 'Biaya Listrik Patungan',
  },
  {
    value: 'CAMPURAN',
    label: 'Sistem Campuran',
  },
] as const;

const inputClass =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)] disabled:opacity-50';

const labelClass = 'mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]';

export function BusinessForm() {
  const [state, formAction, isPending] = useActionState(createBusinessAction, null);

  const fieldErr = (name: string) => state?.fieldErrors?.[name];

  return (
    <>
      {state?.error && (
        <Reveal direction="up" duration={0.2}>
          <div role="alert" className="p-3 bg-[var(--danger-surface)]/80 border border-[var(--danger-border)] rounded-md text-sm text-[var(--danger)]">
            {state.error}
          </div>
        </Reveal>
      )}

      <form data-tour-id="business-profile-form" action={formAction} className="grid gap-4 md:grid-cols-2">
        <Reveal direction="up" delay={0.05}>
          <div>
            <label htmlFor="name" className={labelClass}>
              Nama Usaha <span className="text-[var(--danger)]">*</span>
            </label>
            <input id="name" name="name" type="text" required disabled={isPending} className={inputClass} placeholder="Contoh: Kos Pak Budi" />
            {fieldErr('name') && <p className="text-xs text-[var(--danger)] mt-1">{fieldErr('name')}</p>}
          </div>
        </Reveal>

        <label><span className={labelClass}>Provinsi</span><input name="province" className={inputClass} placeholder="Opsional"/></label>
        <label><span className={labelClass}>Alamat</span><input name="address" className={inputClass} placeholder="Opsional"/></label>
        <label><span className={labelClass}>Kamar/unit terisi</span><input name="occupiedRoomCount" type="number" min="0" className={inputClass}/></label>
        <label><span className={labelClass}>Jumlah pegawai</span><input name="employeeCount" type="number" min="0" className={inputClass}/></label>
        <label><span className={labelClass}>Hari operasi/bulan</span><input name="operatingDaysPerMonth" type="number" min="1" max="31" className={inputClass}/></label>
        <label><span className={labelClass}>Golongan pelanggan</span><input name="customerType" className={inputClass} placeholder="Contoh: B2"/></label>
        <label><span className={labelClass}>Daya terpasang (VA)</span><input name="powerVa" type="number" min="1" className={inputClass}/></label>
        <label><span className={labelClass}>Tarif rata-rata/kWh</span><input name="tariffRupiahPerKwh" type="number" min="0" step="0.01" className={inputClass}/></label>
        <label><span className={labelClass}>Metode pembayaran</span><input name="paymentMethod" className={inputClass} placeholder="Pascabayar/token"/></label>
        <label><span className={labelClass}>Tipe meter</span><input name="meterType" className={inputClass} placeholder="Digital/analog"/></label>
        <label className="md:col-span-2"><span className={labelClass}>Catatan usaha</span><textarea name="businessNotes" rows={2} className={inputClass}/></label>
        <label className="md:col-span-2"><span className={labelClass}>Catatan profil listrik</span><textarea name="electricityNotes" rows={2} className={inputClass}/></label>

        <Reveal direction="up" delay={0.1}>
          <div>
            <label htmlFor="businessType" className={labelClass}>
              Tipe Usaha <span className="text-[var(--danger)]">*</span>
            </label>
            <select id="businessType" name="businessType" required disabled={isPending} className={inputClass} defaultValue="">
              <option value="" disabled>Pilih tipe usaha</option>
              {BUSINESS_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            {fieldErr('businessType') && <p className="text-xs text-[var(--danger)] mt-1">{fieldErr('businessType')}</p>}
          </div>
        </Reveal>

        <Reveal direction="up" delay={0.15}>
          <div>
            <label htmlFor="segment" className={labelClass}>
              Segmen <span className="text-[var(--danger)]">*</span>
            </label>
            <select id="segment" name="segment" required disabled={isPending} className={inputClass} defaultValue="">
              <option value="" disabled>Pilih segmen</option>
              {SEGMENTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            {fieldErr('segment') && <p className="text-xs text-[var(--danger)] mt-1">{fieldErr('segment')}</p>}
          </div>
        </Reveal>

        <Reveal direction="up" delay={0.2}>
          <div>
            <label htmlFor="electricalSystem" className={labelClass}>
              Sistem Listrik <span className="text-[var(--danger)]">*</span>
            </label>
            <select id="electricalSystem" name="electricalSystem" required disabled={isPending} className={inputClass} defaultValue="">
              <option value="" disabled>Pilih sistem listrik</option>
              {ELECTRICAL_SYSTEMS.map((e) => (
                <option key={e.value} value={e.value}>{e.label}</option>
              ))}
            </select>
            {fieldErr('electricalSystem') && <p className="text-xs text-[var(--danger)] mt-1">{fieldErr('electricalSystem')}</p>}
          </div>
        </Reveal>

        <Reveal direction="up" delay={0.25}>
          <div>
            <label htmlFor="city" className={labelClass}>
              Kota
            </label>
            <input id="city" name="city" type="text" disabled={isPending} className={inputClass} placeholder="Contoh: Bandung" />
            {fieldErr('city') && <p className="text-xs text-[var(--danger)] mt-1">{fieldErr('city')}</p>}
          </div>
        </Reveal>

        <Reveal direction="up" delay={0.3}>
          <div>
            <label htmlFor="roomCount" className={labelClass}>
              Jumlah Kamar / Unit
            </label>
            <input id="roomCount" name="roomCount" type="number" min="0" max="10000" disabled={isPending} className={inputClass} placeholder="Opsional" />
            {fieldErr('roomCount') && <p className="text-xs text-[var(--danger)] mt-1">{fieldErr('roomCount')}</p>}
          </div>
        </Reveal>

        <Reveal direction="up" delay={0.35} className="md:col-span-2">
          <InteractiveMotion>
            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2.5 bg-[var(--primary)] hover:bg-[var(--primary)] text-white font-semibold rounded-md transition duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:ring-offset-2 focus:ring-offset-[var(--surface)] disabled:opacity-50"
            >
              {isPending ? 'Menyimpan...' : 'Simpan Profil Usaha'}
            </button>
          </InteractiveMotion>
        </Reveal>
      </form>
    </>
  );
}
