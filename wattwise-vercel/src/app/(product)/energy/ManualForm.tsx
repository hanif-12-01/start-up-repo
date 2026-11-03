'use client';
import { useActionState, useState } from 'react';
import { primaryButton } from '@/components/product/WorkspaceUI';
import { control, zoneLabels } from '@/lib/energy-input';
import { createEnergyAction } from './actions';
import { FormFeedback } from './SourceForm';

export function ManualForm({ businessId, sources }: { businessId: string; sources: { id: string; name: string; sourceType: string }[] }) {
  const [state, action, pending] = useActionState(createEnergyAction, {});
  const [sourceId, setSourceId] = useState('');
  const selectedSourceId = sources.some(s => s.id === sourceId) ? sourceId : '';
  const estimate = sources.find(s => s.id === selectedSourceId)?.sourceType === 'USER_ESTIMATE';
  const errors = Object.fromEntries((state.issues ?? []).map(i => [i.path, i.message]));
  const field = (name: string) => ({ id: `manual-${name}`, name, className: control, 'aria-invalid': !!errors[name], 'aria-describedby': errors[name] ? `manual-${name}-error` : undefined });
  const error = (name: string) => errors[name] && <p id={`manual-${name}-error`} className="mt-1 text-sm text-[var(--danger)]">{errors[name]}</p>;
  if (!sources.length) return <p className="mt-4 text-sm">Tambahkan sumber data listrik terlebih dahulu, lalu masukkan catatan Anda.</p>;
  return <form action={action} onReset={event => event.preventDefault()} aria-busy={pending} className="mt-5 space-y-5">
    <FormFeedback state={state} prefix="manual" /><input type="hidden" name="businessId" value={businessId} />
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="space-y-2"><span className="block text-sm font-semibold">Sumber data listrik</span><select {...field('measurementSourceId')} value={selectedSourceId} onChange={e => setSourceId(e.target.value)} required><option value="">Pilih sumber data listrik</option>{sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>{error('measurementSourceId')}</label>
      <label className="space-y-2"><span className="block text-sm font-semibold">Waktu dalam catatan</span><select {...field('sourceTimezone')} defaultValue="" required><option value="">Pilih zona waktu</option>{Object.entries(zoneLabels).map(([zone, label]) => <option key={zone} value={zone}>{label}</option>)}</select>{error('sourceTimezone')}</label>
      <label className="space-y-2"><span className="block text-sm font-semibold">Awal periode pemakaian</span><input {...field('periodStart')} type="datetime-local" step="1" required />{error('periodStart')}</label>
      <label className="space-y-2"><span className="block text-sm font-semibold">Akhir periode pemakaian</span><input {...field('periodEnd')} type="datetime-local" step="1" required />{error('periodEnd')}</label>
      <label className="space-y-2"><span className="block text-sm font-semibold">Pemakaian listrik (kWh)</span><input {...field('energyKwh')} inputMode="decimal" required pattern="(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,3})?" placeholder="Contoh: 12.5" maxLength={16} /><span className="block text-sm font-normal text-[var(--muted)]">kWh adalah jumlah energi listrik yang digunakan. Gunakan titik desimal, maksimal tiga angka di belakang titik.</span>{error('energyKwh')}</label>
      <label className="space-y-2"><span className="block text-sm font-semibold">Data ini berasal dari mana?</span><select {...field('consumptionBasis')} key={selectedSourceId} defaultValue={estimate ? 'ESTIMATED' : ''} required>{!estimate && <><option value="">Pilih asal angka pemakaian</option><option value="MEASURED">Hasil pembacaan meter</option></>}<option value="ESTIMATED">Perkiraan penggunaan</option></select>{estimate && <span className="block text-sm font-normal text-[var(--muted)]">Sumber ini sudah terdaftar sebagai perkiraan. Datanya tetap perlu diperiksa.</span>}{error('consumptionBasis')}</label>
    </div>
    <p className="max-w-2xl text-sm leading-6 text-[var(--muted)]">Masukkan pemakaian selama periode ini, bukan angka total yang terus bertambah di meter. Waktu mengikuti zona yang Anda pilih; akhir periode tidak termasuk pemakaian berikutnya.</p>
    <label className="block space-y-2"><span className="block text-sm font-semibold">Nomor catatan atau dokumen</span><input {...field('provenanceReference')} required maxLength={240} placeholder="Contoh: buku-meter-3-november" />{error('provenanceReference')}</label>
    <label className="block space-y-2"><span className="block text-sm font-semibold">Catatan (opsional)</span><textarea {...field('notes')} rows={2} maxLength={1000} />{error('notes')}</label>
    <button disabled={pending} className={primaryButton}>{pending ? 'Menyimpan catatan…' : 'Simpan catatan listrik'}</button>
  </form>;
}
