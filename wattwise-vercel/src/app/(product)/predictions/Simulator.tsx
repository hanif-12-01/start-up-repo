'use client';

import { useState } from 'react';
import { decimal, rupiah } from '@/lib/format';

interface ApplianceOption {
  name: string;
  powerWatts: number;
}

export function Simulator({
  baseBill,
  defaultTariff,
  applianceOptions,
}: {
  baseBill: number | null;
  defaultTariff: number | null;
  applianceOptions: ApplianceOption[];
}) {
  const options =
    applianceOptions.length > 0
      ? applianceOptions
      : [
          { name: 'AC 1/2 PK', powerWatts: 500 },
          { name: 'Pompa air', powerWatts: 250 },
          { name: 'Mesin cuci', powerWatts: 500 },
          { name: 'Freezer', powerWatts: 250 },
        ];

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [watts, setWatts] = useState(options[0]?.powerWatts ?? 500);
  const [hours, setHours] = useState(8);
  const [quantity, setQuantity] = useState(1);
  const [days, setDays] = useState(30);

  const validDefault =
    defaultTariff !== null && Number.isFinite(defaultTariff) && defaultTariff > 0
      ? defaultTariff
      : null;
  const [prevDefaultTariff, setPrevDefaultTariff] = useState(defaultTariff);
  const [tariff, setTariff] = useState<number | null>(validDefault);

  if (defaultTariff !== prevDefaultTariff) {
    setPrevDefaultTariff(defaultTariff);
    setTariff(validDefault);
  }

  const monthlyKwh =
    (Math.max(0, watts) * Math.max(0, hours) * Math.max(1, quantity) * Math.max(1, days)) / 1000;
  const hasValidTariff = tariff !== null && Number.isFinite(tariff) && tariff > 0;
  const additionalCost = hasValidTariff ? monthlyKwh * tariff : null;
  const total = additionalCost !== null && baseBill !== null ? baseBill + additionalCost : null;

  const chooseAppliance = (value: number) => {
    setSelectedIndex(value);
    setWatts(options[value]?.powerWatts ?? 500);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="mb-1.5 block text-xs font-bold text-[var(--foreground)]">
            Pilih alat sebagai titik awal
          </span>
          <select
            value={selectedIndex}
            onChange={(event) => chooseAppliance(Number(event.target.value))}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-3 text-sm text-[var(--foreground)] focus:ring-2 focus:ring-emerald-500"
          >
            {options.map((item, index) => (
              <option key={`${item.name}-${index}`} value={index}>
                {item.name} · {item.powerWatts} W
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1.5 block text-xs font-bold text-[var(--foreground)]">Daya alat (W)</span>
          <input
            type="number"
            min="0"
            value={watts}
            onChange={(event) => setWatts(Number(event.target.value))}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-3 text-sm text-[var(--foreground)]"
          />
        </label>
        <label>
          <span className="mb-1.5 block text-xs font-bold text-[var(--foreground)]">Jumlah unit</span>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-3 text-sm text-[var(--foreground)]"
          />
        </label>
        <label>
          <span className="mb-1.5 block text-xs font-bold text-[var(--foreground)]">Jam pakai/hari</span>
          <input
            type="number"
            min="0"
            max="24"
            step="0.5"
            value={hours}
            onChange={(event) => setHours(Number(event.target.value))}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-3 text-sm text-[var(--foreground)]"
          />
        </label>
        <label>
          <span className="mb-1.5 block text-xs font-bold text-[var(--foreground)]">Hari operasi</span>
          <input
            type="number"
            min="1"
            max="31"
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-3 text-sm text-[var(--foreground)]"
          />
        </label>
        <label className="sm:col-span-2">
          <span className="mb-1.5 block text-xs font-bold text-[var(--foreground)]">
            Tarif acuan (Rp/kWh)
          </span>
          <input
            type="number"
            min="0"
            step="1"
            placeholder="Belum ada tarif"
            value={tariff === null ? '' : tariff}
            onChange={(event) => {
              const val = event.target.value.trim();
              if (val === '') {
                setTariff(null);
              } else {
                const parsed = Number(val);
                setTariff(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
              }
            }}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-3 text-sm text-[var(--foreground)]"
          />
          <span className="mt-1.5 block text-[11px] text-[var(--muted)]">
            {tariff !== null
              ? 'Digunakan hanya untuk simulasi biaya dan tidak mengubah data profil.'
              : 'Tarif belum tersedia. Isi tarif acuan jika Anda ingin melihat estimasi biaya.'}
          </span>
        </label>
      </div>
      <div className="rounded-3xl bg-[var(--surface-muted)] border border-[var(--border)] p-6 text-[var(--foreground)]">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--primary)]">
          Hasil simulasi
        </p>
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl bg-[var(--surface)] p-4 border border-[var(--border)]">
            <p className="text-xs text-[var(--muted)]">Tambahan profil pemakaian</p>
            <p className="mt-1 text-2xl font-black">{decimal.format(monthlyKwh)} kWh/bulan</p>
          </div>
          <div className="rounded-2xl bg-[var(--surface)] p-4 border border-[var(--border)]">
            <p className="text-xs text-[var(--muted)]">Estimasi tambahan biaya</p>
            {additionalCost !== null ? (
              <p className="mt-1 text-2xl font-black">{rupiah.format(additionalCost)}</p>
            ) : (
              <p className="mt-2 text-sm font-semibold text-[var(--muted)] leading-snug">
                Masukkan tarif untuk menghitung estimasi biaya
              </p>
            )}
          </div>
          <div className="rounded-2xl bg-[var(--primary-soft)] p-4 text-[var(--foreground)] border border-[var(--border)]">
            <p className="text-xs font-bold text-[var(--primary)]">
              Ilustrasi total dengan tagihan terakhir
            </p>
            {total !== null ? (
              <p className="mt-1 text-2xl font-black text-[var(--primary)]">{rupiah.format(total)}</p>
            ) : !hasValidTariff ? (
              <p className="mt-2 text-sm font-semibold text-[var(--muted)] leading-snug">
                Masukkan tarif untuk menghitung estimasi total
              </p>
            ) : (
              <p className="mt-2 text-sm font-semibold text-[var(--muted)] leading-snug">
                Butuh tagihan acuan
              </p>
            )}
          </div>
        </div>
        <p className="mt-5 text-xs leading-5 text-[var(--muted)]">
          Simulasi memakai watt label, asumsi jam pakai, dan tarif yang Anda masukkan. Hasil bukan
          prediksi tagihan resmi dan belum memperhitungkan siklus kerja alat, pajak, atau komponen
          biaya lain.
        </p>
      </div>
    </div>
  );
}
