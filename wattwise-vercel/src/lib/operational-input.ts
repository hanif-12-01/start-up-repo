export function operationalError(code?: string): string {
  switch (code) {
    case 'DUPLICATE_PROCESS':
      return 'Nama aktivitas ini sudah terdaftar. Gunakan nama yang berbeda atau pilih aktivitas yang sudah ada.';
    case 'DUPLICATE_RECORD':
      return 'Catatan untuk aktivitas dan rentang waktu ini sudah pernah disimpan.';
    case 'OVERLAPPING_PERIOD':
      return 'Periode waktu yang dipilih bertumpang tindih dengan catatan yang sudah ada untuk aktivitas ini.';
    case 'NOT_FOUND':
      return 'Usaha atau aktivitas yang dipilih tidak ditemukan atau sudah tidak aktif.';
    case 'OPERATIONAL_WRITE_DENIED':
      return 'Fitur pencatatan operasional belum tersedia untuk akun ini. Hubungi pengelola untuk memeriksa akses.';
    case 'UNAUTHENTICATED':
      return 'Sesi masuk telah berakhir. Silakan masuk kembali.';
    case 'VALIDATION_ERROR':
      return 'Ada isian yang belum sesuai. Periksa keterangan di bawah.';
    default:
      return 'Data aktivitas belum dapat diproses. Coba beberapa saat lagi.';
  }
}

export function operationalIssue(path: string, fallback: string): string {
  switch (path) {
    case 'name':
      return 'Nama aktivitas usaha wajib diisi (1–120 karakter).';
    case 'outputUnit':
      return 'Satuan hasil wajib diisi, misalnya kg, pcs, porsi (1–30 karakter).';
    case 'outputQuantity':
      return 'Jumlah hasil harus berupa angka 0 atau lebih (misalnya 150 atau 150.5), maksimal 3 angka desimal.';
    case 'periodEnd':
      return 'Waktu selesai harus setelah waktu mulai.';
    case 'periodStart':
      return 'Waktu mulai harus diisi dengan benar.';
    default:
      return fallback;
  }
}

export function localToIso(localDatetime: string, offset: string = '+07:00'): string {
  if (!localDatetime) return '';
  // localDatetime typically "YYYY-MM-DDTHH:mm"
  const clean = localDatetime.trim();
  if (clean.includes('Z') || /[+-]\d{2}:\d{2}$/.test(clean)) return clean;
  return `${clean}:00${offset}`;
}

export function formatDateTimeId(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(d);
}

export const commonUnits = [
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'pcs', label: 'Buah / Pcs' },
  { value: 'porsi', label: 'Porsi' },
  { value: 'liter', label: 'Liter' },
  { value: 'lembar', label: 'Lembar' },
  { value: 'pasang', label: 'Pasang' },
];
