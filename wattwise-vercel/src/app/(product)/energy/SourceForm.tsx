'use client';
import { useActionState, useEffect, useRef } from 'react';
import { primaryButton } from '@/components/product/WorkspaceUI';
import { createSourceAction, type EnergyFormState } from './actions';
import { control } from '@/lib/energy-input';

export function FormFeedback({ state, prefix }: { state: EnergyFormState; prefix: string }) {
  const summary = useRef<HTMLDivElement>(null);
  useEffect(() => { if (state.error) summary.current?.focus(); }, [state]);
  return <>{state.error && <div ref={summary} tabIndex={-1} role="alert" className="rounded-xl border border-[var(--danger-border)] bg-[var(--danger-surface)] p-4 text-sm text-[var(--danger)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"><p className="font-bold">{state.error}</p>{state.issues?.length ? <ul className="mt-2 list-disc pl-5">{state.issues.map((issue, i) => <li key={i}><a className="underline underline-offset-4" href={`#${prefix}-${issue.path}`}>{issue.message}</a></li>)}</ul> : null}{state.code === 'UNAUTHENTICATED' && <a className="mt-2 inline-block underline" href="/login">Masuk kembali</a>}</div>}{state.success && <p role="status" className="text-sm font-semibold text-[var(--success)]">{state.success}</p>}</>;
}

export function SourceForm({ businessId }: { businessId: string }) {
  const [state, action, pending] = useActionState(createSourceAction, {});
  const errors = Object.fromEntries((state.issues ?? []).map(i => [i.path, i.message]));
  const field = (name: string) => ({ id: `source-${name}`, name, className: control, 'aria-invalid': !!errors[name], 'aria-describedby': errors[name] ? `source-${name}-error` : undefined });
  const error = (name: string) => errors[name] && <p id={`source-${name}-error`} className="mt-1 text-sm text-[var(--danger)]">{errors[name]}</p>;
  return <details className="mt-5 border-t border-[var(--border)] pt-4"><summary className="w-fit min-h-11 cursor-pointer rounded-lg py-2 font-bold focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]">Tambah sumber data listrik</summary>
    <form action={action} onReset={event => event.preventDefault()} aria-busy={pending} className="mt-4 space-y-4">
      <FormFeedback state={state} prefix="source" /><input type="hidden" name="businessId" value={businessId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2"><span className="block text-sm font-semibold">Nama sumber</span><input {...field('name')} required maxLength={120} placeholder="Contoh: Meter utama" />{error('name')}</label>
        <label className="space-y-2"><span className="block text-sm font-semibold">Jenis sumber</span><select {...field('sourceType')} required defaultValue=""><option value="">Pilih jenis sumber</option><option value="METER">Meter listrik</option><option value="DOCUMENT">Dokumen pemakaian</option><option value="USER_ESTIMATE">Perkiraan penggunaan</option><option value="SENSOR">Sensor — data dimasukkan sendiri</option></select>{error('sourceType')}</label>
        <label className="space-y-2"><span className="block text-sm font-semibold">Bagian usaha yang dicatat</span><select {...field('measurementBoundary')} required><option value="UNKNOWN">Belum diketahui</option><option value="WHOLE_SITE">Seluruh lokasi</option><option value="SUBMETER">Sebagian lokasi</option></select>{error('measurementBoundary')}</label>
        <label className="space-y-2"><span className="block text-sm font-semibold">Nomor atau kode sumber</span><input {...field('provenanceKey')} required maxLength={120} pattern="[A-Za-z0-9][A-Za-z0-9._:\-]*" placeholder="Contoh: meter-utama-01" /><span className="block text-sm font-normal text-[var(--muted)]">Gunakan nomor meter atau kode singkat yang sama untuk sumber ini. Huruf dan angka tanpa spasi; titik, garis bawah, titik dua, tanda hubung boleh digunakan.</span>{error('provenanceKey')}</label>
      </div>
      <p className="max-w-2xl text-sm leading-6 text-[var(--muted)]">Jangan masukkan kata sandi sebagai kode sumber. Pilihan sensor tidak menghubungkan perangkat otomatis.</p>
      <label className="block space-y-2"><span className="block text-sm font-semibold">Deskripsi (opsional)</span><textarea {...field('description')} rows={2} maxLength={1000} />{error('description')}</label>
      <button disabled={pending} className={primaryButton}>{pending ? 'Menyimpan sumber…' : 'Simpan sumber'}</button>
    </form>
  </details>;
}
