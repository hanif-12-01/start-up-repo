'use client';

import { useState } from 'react';
import { Camera, CheckCircle2, LoaderCircle, ShieldCheck } from 'lucide-react';
import { parseMeterReading, type MeterCandidate } from '@/lib/meter-ocr';

export function MeterOcrInput({ targetInputId }: { targetInputId: string }) {
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [candidates, setCandidates] = useState<MeterCandidate[]>([]);

  async function readImage(file: File) {
    setCandidates([]);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) {
      setStatus('Gunakan JPG, PNG, atau WebP maksimal 8 MB.'); return;
    }
    setStatus('Menyiapkan OCR lokal…'); setProgress(2);
    const objectUrl = URL.createObjectURL(file);
    try {
      const { createWorker, OEM } = await import('tesseract.js');
      const worker = await createWorker('eng', OEM.LSTM_ONLY, {
        workerPath: '/tesseract/worker.min.js',
        corePath: '/tesseract/core',
        langPath: '/tesseract/lang',
        gzip: true,
        logger: (message) => { if (typeof message.progress === 'number') setProgress(Math.round(message.progress * 100)); setStatus(message.status === 'recognizing text' ? 'Membaca angka meter secara lokal…' : 'Menyiapkan mesin OCR lokal…'); },
      });
      const result = await worker.recognize(objectUrl);
      await worker.terminate();
      const parsed = parseMeterReading(result.data.text, result.data.confidence, 75);
      setCandidates(parsed.candidates.slice(0, 5));
      setStatus(parsed.success ? (parsed.ambiguous ? 'Beberapa angka ditemukan. Pilih dan verifikasi dengan foto.' : 'Angka ditemukan. Verifikasi sebelum digunakan.') : 'Angka meter belum terbaca. Masukkan manual atau coba foto lebih jelas.');
      setProgress(100);
    } catch {
      setStatus('OCR lokal belum berhasil dijalankan. Foto tidak dikirim; silakan masukkan angka manual.');
    } finally { URL.revokeObjectURL(objectUrl); }
  }

  function choose(candidate: MeterCandidate) {
    const input = document.getElementById(targetInputId) as HTMLInputElement | null;
    if (input) { input.value = String(candidate.value); input.dispatchEvent(new Event('input', { bubbles: true })); input.focus(); }
    setStatus(`Angka ${candidate.value} dipindahkan ke meter akhir. Cocokkan kembali dengan foto.`);
  }

  return <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4"><div className="flex items-start gap-3"><Camera className="h-5 w-5 text-[var(--primary)]"/><div><p className="text-sm font-bold">Bantu baca foto meter</p><p className="mt-1 text-xs leading-5 text-[var(--muted)]">OCR berjalan di browser dengan worker, WASM, dan data bahasa lokal. Foto tidak diunggah atau disimpan.</p></div></div><label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-bold"><Camera className="h-4 w-4"/>Pilih/ambil foto<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void readImage(file); }}/></label>{status && <div role="status" className="mt-3 flex items-start gap-2 text-xs leading-5 text-[var(--muted)]">{progress > 0 && progress < 100 ? <LoaderCircle className="mt-0.5 h-4 w-4 animate-spin"/> : <ShieldCheck className="mt-0.5 h-4 w-4"/>}<span>{status}{progress > 0 && progress < 100 ? ` ${progress}%` : ''}</span></div>}{candidates.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{candidates.map((candidate) => <button key={candidate.id} type="button" onClick={() => choose(candidate)} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-3 py-2 text-sm font-bold text-white"><CheckCircle2 className="h-4 w-4"/>{candidate.value} <span className="text-[10px] opacity-75">{Math.round(candidate.confidence)}%</span></button>)}</div>}</div>;
}
