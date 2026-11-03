'use client';
import { useActionState, useEffect, useRef, useState } from 'react';
import { primaryButton, secondaryButton } from '@/components/product/WorkspaceUI';
import { control } from '@/lib/energy-input';
import { csvColumns, csvLabels, csvMapping, csvMaxBytes, csvTemplate, parseEnergyCsv, type CsvRequest } from '@/lib/energy-csv';
import { energyCsvAction } from './actions';

function CsvPreview({ request }: { request: string }) {
  const [state, action, pending] = useActionState(energyCsvAction, {});
  const feedback = useRef<HTMLDivElement>(null);
  useEffect(() => { if (state.error || state.rows) feedback.current?.focus(); }, [state]);
  return <div className="space-y-4">
    <form action={action} aria-busy={pending}><input type="hidden" name="request" value={request} /><button name="intent" value="preview" disabled={pending} className={secondaryButton}>{pending ? 'Memeriksa catatan…' : 'Periksa data'}</button></form>
    <div ref={feedback} tabIndex={-1} className="space-y-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]">{state.error && <p role="alert" className="text-sm text-[var(--danger)]">{state.error}</p>}
    {state.rows && <>
      <h3 className="font-bold">{state.imported ? 'Hasil penyimpanan' : 'Periksa catatan sebelum menyimpan'}</h3>
      <p role="status" className="text-sm font-semibold">{state.imported ? `${state.rows.filter(r => r.status === 'SAVED').length} catatan tersimpan. ${state.rows.filter(r => r.status !== 'SAVED').length} tidak disimpan.` : `${state.rows.length} catatan diperiksa. ${state.rows.filter(r => r.status === 'READY').length} siap disimpan. ${state.rows.filter(r => r.status !== 'READY').length} perlu diperbaiki. Belum ada data disimpan.`}</p>
      <ol tabIndex={0} className="max-h-96 space-y-4 overflow-y-auto rounded-xl border border-[var(--border)] p-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]" aria-label="Hasil pemeriksaan catatan listrik">{state.rows.map(row => <li key={row.row} className="break-words"><strong>Baris {row.row}: {row.energyKwh} kWh</strong><p>{row.periodStart} – {row.periodEnd}</p><p>{['ESTIMATED', 'Perkiraan penggunaan'].includes(row.basis) ? 'Perkiraan penggunaan — perlu diperiksa' : ['MEASURED', 'Hasil pembacaan meter'].includes(row.basis) ? 'Hasil pembacaan meter' : 'Asal angka belum sesuai'} · Nomor catatan: {row.reference}</p><p className="mt-1 font-semibold">{row.message}</p></li>)}</ol>
      {!state.imported && state.rows.some(r => r.status === 'READY') && <form action={action} aria-busy={pending} className="space-y-4"><input type="hidden" name="request" value={state.request} /><label className="flex min-h-11 items-start gap-3 text-sm leading-6"><input className="mt-1 size-5 shrink-0" type="checkbox" name="confirmed" value="yes" required />Saya setuju menyimpan catatan yang siap saja. Catatan bermasalah tidak disimpan.</label><p className="text-sm text-[var(--muted)]">Data diperiksa kembali saat disimpan. Hasil setiap catatan akan ditampilkan.</p><button name="intent" value="import" disabled={pending} className={primaryButton}>{pending ? 'Menyimpan catatan…' : 'Simpan catatan yang siap'}</button></form>}
    </>}</div>
  </div>;
}

export function CsvForm({ businessId, sources }: { businessId: string; sources: { id: string; name: string }[] }) {
  const [file, setFile] = useState<ReturnType<typeof parseEnergyCsv>>();
  const [error, setError] = useState(''); const [reading, setReading] = useState(false);
  const [source, setSource] = useState(''); const [zone, setZone] = useState('');
  const [mapping, setMapping] = useState<CsvRequest['mapping']>();
  const input = useRef<HTMLInputElement>(null);
  const problem = useRef<HTMLDivElement>(null);
  useEffect(() => { if (error) problem.current?.focus(); }, [error]);
  if (!sources.length) return <p className="mt-4 text-sm">Tambahkan sumber data listrik terlebih dahulu, lalu unggah catatan Anda.</p>;
  return <details className="mt-4"><summary className="w-fit min-h-11 cursor-pointer rounded-lg py-2 font-bold focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]">Unggah catatan listrik</summary><div className="mt-4 space-y-5">
    <p className="max-w-2xl text-sm leading-6">Sudah punya catatan listrik dalam file? Unggah di sini. WattWise akan memeriksa datanya sebelum disimpan.</p>
    <ol className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold" aria-label="Langkah memasukkan data"><li>1. Pilih sumber</li><li>2. Pilih file</li><li>3. Periksa data</li><li>4. Simpan</li></ol>
    <label className="block space-y-2 text-sm font-semibold">Sumber data listrik<select className={control} value={source} onChange={e => setSource(e.target.value)} required><option value="">Pilih sumber data listrik</option>{sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
    <label className="block space-y-2 text-sm font-semibold">Waktu dalam catatan<select className={control} value={zone} onChange={e => setZone(e.target.value)} required aria-describedby="csv-zone-help"><option value="">Pilih zona waktu</option><option value="Asia/Jakarta">WIB — Indonesia Barat</option><option value="Asia/Makassar">WITA — Indonesia Tengah</option><option value="Asia/Jayapura">WIT — Indonesia Timur</option><option value="UTC">UTC</option></select></label>
    <p id="csv-zone-help" className="text-sm text-[var(--muted)]">Pilih waktu yang digunakan dalam catatan, bukan lokasi perangkat Anda.</p>
    <div className="space-y-2 text-sm"><p>Gunakan file .csv, maksimal 128 KiB dan 100 catatan. File Excel belum didukung.</p><a className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4" download="wattwise-catatan-listrik.csv" href={'data:text/csv;charset=utf-8,' + encodeURIComponent(csvTemplate)}>Unduh contoh file</a><p className="max-w-2xl text-[var(--muted)]">File unduhan berisi judul kolom, belum berisi data. Tambahkan minimal satu catatan listrik Anda. Jangan masukkan angka total yang terus bertambah di meter.</p></div>
    <details className="text-sm"><summary className="w-fit min-h-11 cursor-pointer rounded-lg py-2 font-semibold focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]">Petunjuk format file</summary><div className="max-w-2xl space-y-2 py-2 leading-6"><p>Isi waktu mulai dan selesai, pemakaian kWh, asal angka, serta nomor catatan. Catatan tambahan boleh dikosongkan.</p><p>Asal angka: “Hasil pembacaan meter” atau “Perkiraan penggunaan”. Gunakan titik untuk desimal, misalnya 12.5; maksimal tiga angka di belakang titik.</p><p>Format waktu: 2026-01-01T08:00:00+07:00 untuk WIB, +08:00 untuk WITA, +09:00 untuk WIT. Akhir periode tidak termasuk pemakaian berikutnya.</p><p>Untuk aplikasi pembuat file: CSV UTF-8, pemisah koma. Nama kolom format lama tetap didukung. File tidak dikirim ke layanan eksternal.</p></div></details>
    <label className="block space-y-2 text-sm font-semibold">Pilih file catatan listrik<input ref={input} className={control} type="file" accept=".csv,text/csv" disabled={reading} aria-describedby="csv-file-feedback" aria-invalid={!!error} onChange={async e => {
      setFile(undefined); setMapping(undefined); setError(''); const selectedFile = e.target.files?.[0]; if (!selectedFile) return;
      setReading(true);
      try {
        if (!selectedFile.name.toLowerCase().endsWith('.csv')) throw new Error('Jenis file belum didukung. Gunakan file .csv.');
        if (selectedFile.size > csvMaxBytes) throw new Error('File terlalu besar. Gunakan file maksimal 128 KiB atau bagi menjadi beberapa file.');
        const parsed = parseEnergyCsv(new TextDecoder('utf-8', { fatal: true }).decode(await selectedFile.arrayBuffer()));
        setFile(parsed); setMapping(csvMapping(parsed.headers));
      } catch (error) { setError(error instanceof TypeError ? 'File tidak dapat dibaca. Simpan ulang sebagai CSV UTF-8, lalu pilih kembali.' : error instanceof Error ? error.message : 'File tidak dapat dibaca. Pilih file lain, lalu coba lagi.'); }
      finally { setReading(false); }
    }} /></label>
    <div id="csv-file-feedback" ref={problem} tabIndex={-1} className="rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]">{reading && <p role="status">Membaca file…</p>}{error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}</div>
    {(file || error) && <button type="button" className={secondaryButton} onClick={() => { setFile(undefined); setMapping(undefined); setError(''); if (input.current) { input.current.value = ''; input.current.click(); } }}>Pilih file lain</button>}
    {file && mapping && <><p role="status" className="text-sm font-semibold">{file.rows.length} catatan terbaca. Periksa data sebelum menyimpan.</p><details open={csvColumns.some(key => !['notes', 'unit', 'measurementKind'].includes(key) && mapping[key] < 0)}><summary className="w-fit min-h-11 cursor-pointer rounded-lg py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]">Sesuaikan kolom file (bila diperlukan)</summary><div className="mt-3 grid gap-4 sm:grid-cols-2">{csvColumns.map(key => <label key={key} className="space-y-2 text-sm font-semibold">{csvLabels[key]}<select className={control} value={mapping[key]} onChange={e => setMapping({ ...mapping, [key]: Number(e.target.value) })}><option value={-1}>{key === 'notes' ? 'Tidak digunakan' : key === 'unit' ? 'Semua angka dalam kWh' : key === 'measurementKind' ? 'Pemakaian selama periode' : 'Pilih kolom'}</option>{file.headers.map((header, index) => <option key={index} value={index}>{header}</option>)}</select></label>)}</div></details>{!source || !zone ? <p className="text-sm">Pilih sumber data listrik dan zona waktu untuk memeriksa catatan.</p> : <CsvPreview key={JSON.stringify([source, zone, mapping, file])} request={JSON.stringify({ businessId, measurementSourceId: source, sourceTimezone: zone, ...file, mapping })} />}</>}
  </div></details>;
}
