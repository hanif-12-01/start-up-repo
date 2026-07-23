'use client';

import { useActionState } from 'react';
import { createBusinessAction } from './actions';

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
  'w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50';

const labelClass = 'block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1';

export function BusinessForm() {
  const [state, formAction, isPending] = useActionState(createBusinessAction, null);

  const fieldErr = (name: string) => state?.fieldErrors?.[name];

  return (
    <>
      {state?.error && (
        <div role="alert" className="p-3 bg-red-950/80 border border-red-800 rounded-md text-sm text-red-200">
          {state.error}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="name" className={labelClass}>
            Nama Usaha <span className="text-red-400">*</span>
          </label>
          <input id="name" name="name" type="text" required disabled={isPending} className={inputClass} placeholder="Contoh: Kos Pak Budi" />
          {fieldErr('name') && <p className="text-xs text-red-400 mt-1">{fieldErr('name')}</p>}
        </div>

        <div>
          <label htmlFor="businessType" className={labelClass}>
            Tipe Usaha <span className="text-red-400">*</span>
          </label>
          <select id="businessType" name="businessType" required disabled={isPending} className={inputClass} defaultValue="">
            <option value="" disabled>Pilih tipe usaha</option>
            {BUSINESS_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          {fieldErr('businessType') && <p className="text-xs text-red-400 mt-1">{fieldErr('businessType')}</p>}
        </div>

        <div>
          <label htmlFor="segment" className={labelClass}>
            Segmen <span className="text-red-400">*</span>
          </label>
          <select id="segment" name="segment" required disabled={isPending} className={inputClass} defaultValue="">
            <option value="" disabled>Pilih segmen</option>
            {SEGMENTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          {fieldErr('segment') && <p className="text-xs text-red-400 mt-1">{fieldErr('segment')}</p>}
        </div>

        <div>
          <label htmlFor="electricalSystem" className={labelClass}>
            Sistem Listrik <span className="text-red-400">*</span>
          </label>
          <select id="electricalSystem" name="electricalSystem" required disabled={isPending} className={inputClass} defaultValue="">
            <option value="" disabled>Pilih sistem listrik</option>
            {ELECTRICAL_SYSTEMS.map((e) => (
              <option key={e.value} value={e.value}>{e.label}</option>
            ))}
          </select>
          {fieldErr('electricalSystem') && <p className="text-xs text-red-400 mt-1">{fieldErr('electricalSystem')}</p>}
        </div>

        <div>
          <label htmlFor="city" className={labelClass}>
            Kota
          </label>
          <input id="city" name="city" type="text" disabled={isPending} className={inputClass} placeholder="Contoh: Bandung" />
          {fieldErr('city') && <p className="text-xs text-red-400 mt-1">{fieldErr('city')}</p>}
        </div>

        <div>
          <label htmlFor="roomCount" className={labelClass}>
            Jumlah Kamar / Unit
          </label>
          <input id="roomCount" name="roomCount" type="number" min="0" max="10000" disabled={isPending} className={inputClass} placeholder="Opsional" />
          {fieldErr('roomCount') && <p className="text-xs text-red-400 mt-1">{fieldErr('roomCount')}</p>}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-md transition duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50"
        >
          {isPending ? 'Menyimpan...' : 'Simpan Profil Usaha'}
        </button>
      </form>
    </>
  );
}
