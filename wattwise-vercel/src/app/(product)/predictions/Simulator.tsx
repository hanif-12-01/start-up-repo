'use client';

import { useState } from 'react';
import { decimal, rupiah } from '@/lib/format';

interface ApplianceOption { name: string; powerWatts: number }

export function Simulator({ baseBill, defaultTariff, applianceOptions }: {
  baseBill: number | null;
  defaultTariff: number;
  applianceOptions: ApplianceOption[];
}) {
  const options = applianceOptions.length > 0 ? applianceOptions : [
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
  const [tariff, setTariff] = useState(defaultTariff);

  const monthlyKwh = Math.max(0, watts) * Math.max(0, hours) * Math.max(1, quantity) * Math.max(1, days) / 1000;
  const additionalCost = monthlyKwh * Math.max(0, tariff);
  const result = {
    monthlyKwh,
    additionalCost,
    total: baseBill === null ? null : baseBill + additionalCost,
  };

  const chooseAppliance = (value: number) => {
    setSelectedIndex(value);
    setWatts(options[value]?.powerWatts ?? 500);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-bold text-slate-700">Pilih alat sebagai titik awal</span><select value={selectedIndex} onChange={(event) => chooseAppliance(Number(event.target.value))} className="w-full rounded-xl border border-emerald-900/15 bg-[#fbfcfa] px-3 py-3 text-sm focus:ring-2 focus:ring-emerald-500">{options.map((item, index) => <option key={`${item.name}-${index}`} value={index}>{item.name} · {item.powerWatts} W</option>)}</select></label>
        <label><span className="mb-1.5 block text-xs font-bold text-slate-700">Daya alat (W)</span><input type="number" min="0" value={watts} onChange={(event) => setWatts(Number(event.target.value))} className="w-full rounded-xl border border-emerald-900/15 bg-[#fbfcfa] px-3 py-3 text-sm" /></label>
        <label><span className="mb-1.5 block text-xs font-bold text-slate-700">Jumlah unit</span><input type="number" min="1" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} className="w-full rounded-xl border border-emerald-900/15 bg-[#fbfcfa] px-3 py-3 text-sm" /></label>
        <label><span className="mb-1.5 block text-xs font-bold text-slate-700">Jam pakai/hari</span><input type="number" min="0" max="24" step="0.5" value={hours} onChange={(event) => setHours(Number(event.target.value))} className="w-full rounded-xl border border-emerald-900/15 bg-[#fbfcfa] px-3 py-3 text-sm" /></label>
        <label><span className="mb-1.5 block text-xs font-bold text-slate-700">Hari operasi</span><input type="number" min="1" max="31" value={days} onChange={(event) => setDays(Number(event.target.value))} className="w-full rounded-xl border border-emerald-900/15 bg-[#fbfcfa] px-3 py-3 text-sm" /></label>
        <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-bold text-slate-700">Tarif acuan (Rp/kWh)</span><input type="number" min="0" step="1" value={tariff} onChange={(event) => setTariff(Number(event.target.value))} className="w-full rounded-xl border border-emerald-900/15 bg-[#fbfcfa] px-3 py-3 text-sm" /></label>
      </div>
      <div className="rounded-3xl bg-emerald-700 p-6 text-white">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-200">Hasil simulasi</p>
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-emerald-100">Tambahan profil pemakaian</p><p className="mt-1 text-2xl font-black">{decimal.format(result.monthlyKwh)} kWh/bulan</p></div>
          <div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-emerald-100">Estimasi tambahan biaya</p><p className="mt-1 text-2xl font-black">{rupiah.format(result.additionalCost)}</p></div>
          <div className="rounded-2xl bg-white p-4 text-emerald-950"><p className="text-xs font-bold text-emerald-700">Ilustrasi total dengan tagihan terakhir</p><p className="mt-1 text-2xl font-black">{result.total === null ? 'Butuh tagihan acuan' : rupiah.format(result.total)}</p></div>
        </div>
        <p className="mt-5 text-xs leading-5 text-emerald-100">Simulasi memakai watt label, asumsi jam pakai, dan tarif yang Anda masukkan. Hasil bukan prediksi tagihan resmi dan belum memperhitungkan siklus kerja alat, pajak, atau komponen biaya lain.</p>
      </div>
    </div>
  );
}
