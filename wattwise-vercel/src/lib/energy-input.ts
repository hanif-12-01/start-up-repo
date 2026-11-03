import { createEnergyMeasurementSchema } from '@/server/validation/measurements';

export const zoneOffsets = { 'Asia/Jakarta': '+07:00', 'Asia/Makassar': '+08:00', 'Asia/Jayapura': '+09:00', UTC: '+00:00' } as const;
export const zoneLabels: Record<string, string> = { 'Asia/Jakarta': 'WIB — Indonesia Barat', 'Asia/Makassar': 'WITA — Indonesia Tengah', 'Asia/Jayapura': 'WIT — Indonesia Timur', UTC: 'UTC' };
export const control = 'min-h-11 w-full min-w-0 rounded-xl border border-[var(--border)] bg-[var(--control-background)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] disabled:opacity-60';
export const sourceLabels: Record<string, string> = { METER: 'Meter listrik', SENSOR: 'Sensor (input sendiri)', DOCUMENT: 'Dokumen', USER_ESTIMATE: 'Estimasi pengguna' };
export const boundaryLabels: Record<string, string> = { WHOLE_SITE: 'Seluruh lokasi', SUBMETER: 'Sebagian lokasi', UNKNOWN: 'Batas belum diketahui' };
export function energyIssue(path: string, message: string) {
  if (message.includes('setelah awal')) return 'Waktu selesai harus setelah waktu mulai. Periksa kembali tanggal dan jamnya.';
  if (message.includes('Offset timestamp')) return 'Tanggal atau jam memakai zona waktu berbeda. Sesuaikan waktu dengan WIB, WITA, WIT, atau UTC yang dipilih.';
  return ({ name: 'Nama sumber wajib diisi, maksimal 120 karakter.', sourceType: 'Pilih jenis sumber data listrik.', measurementBoundary: 'Pilih bagian usaha yang dicatat.', provenanceKey: 'Isi nomor atau kode sumber, maksimal 120 karakter. Gunakan huruf, angka, titik, garis bawah, titik dua, atau tanda hubung; awali dengan huruf atau angka.', description: 'Deskripsi maksimal 1000 karakter.', periodStart: 'Waktu mulai belum sesuai. Isi tanggal dan jam yang benar; pada file sertakan zona waktu seperti +07:00 untuk WIB.', periodEnd: 'Waktu selesai belum sesuai. Isi tanggal dan jam yang benar; pada file sertakan zona waktu seperti +07:00 untuk WIB.', sourceTimezone: 'Pilih waktu dalam catatan: WIB, WITA, WIT, atau UTC.', energyKwh: 'Pemakaian listrik (kWh) belum benar. Gunakan angka nol atau lebih, misalnya 12.5, maksimal tiga angka desimal dan 999999999999.999 kWh.', consumptionBasis: 'Asal angka pemakaian belum sesuai. Pilih Hasil pembacaan meter atau Perkiraan penggunaan.', provenanceReference: 'Nomor catatan atau dokumen wajib diisi, maksimal 240 karakter.', notes: 'Catatan maksimal 1000 karakter.', unit: 'Satuan pemakaian harus kWh. Periksa satuan di catatan Anda.', measurementKind: 'Gunakan pemakaian selama periode ini, bukan angka total yang terus bertambah di meter.', qualityStatus: 'Data perkiraan perlu diperiksa sebelum digunakan.', measurementSourceId: 'Pilih sumber data listrik yang masih aktif.', businessId: 'Pilih usaha yang masih aktif.' } as Record<string, string>)[path] ?? 'Ada informasi yang belum sesuai. Periksa isian dan coba lagi.';
}
export function energyError(code: string) {
  return ({ VALIDATION_ERROR: 'Periksa informasi yang ditandai, lalu coba lagi.', MEASUREMENT_WRITE_DENIED: 'Fitur pencatatan listrik belum tersedia untuk akun ini.', UNAUTHENTICATED: 'Sesi Anda berakhir. Masuk kembali sebelum menyimpan catatan.', NOT_FOUND: 'Usaha atau sumber data listrik tidak tersedia. Pilih kembali usaha dan sumber Anda.', DUPLICATE_SOURCE: 'Nomor atau kode sumber sudah digunakan. Pilih sumber yang sudah ada atau gunakan kode lain.', DUPLICATE_INTERVAL: 'Data untuk periode ini sudah pernah disimpan. Periksa riwayat sebelum mencoba lagi.', OVERLAPPING_INTERVAL: 'Ada catatan yang waktunya bertumpang tindih dengan data lain. Periksa waktu mulai dan selesai.', SOURCE_BASIS_MISMATCH: 'Sumber ini berisi perkiraan. Pilih Perkiraan penggunaan, bukan hasil pembacaan meter.' } as Record<string, string>)[code] ?? 'Catatan belum dapat diproses. Coba lagi; periksa riwayat sebelum mengulangi penyimpanan.';
}

export function localTimestamp(value: string, timezone: string): string {
  const offset = zoneOffsets[timezone as keyof typeof zoneOffsets];
  if (!offset || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value)) return value;
  return `${value.length === 16 ? value + ':00' : value}${offset}`;
}

export function manualInput(form: FormData) {
  const text = (key: string) => typeof form.get(key) === 'string' ? form.get(key) as string : '';
  const sourceTimezone = text('sourceTimezone');
  return createEnergyMeasurementSchema.safeParse({
    businessId: text('businessId'), measurementSourceId: text('measurementSourceId'),
    periodStart: localTimestamp(text('periodStart'), sourceTimezone), periodEnd: localTimestamp(text('periodEnd'), sourceTimezone), sourceTimezone,
    energyKwh: text('energyKwh'), unit: 'kWh', measurementKind: 'INTERVAL_ENERGY', measurementMethod: 'MANUAL',
    consumptionBasis: text('consumptionBasis'), qualityStatus: text('consumptionBasis') === 'ESTIMATED' ? 'NEEDS_REVIEW' : 'RECORDED',
    provenanceReference: text('provenanceReference'), ...(text('notes') ? { notes: text('notes') } : {}),
  });
}
