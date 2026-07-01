export type ElectricityInput = {
  namaUsaha: string;
  jenisUsaha: string;
  lokasiUsaha: string;
  dayaListrik?: string;
  rataRataTagihan: number | string;
  tagihanBulanLalu: number | string;
  pemakaianKwh?: number | string;
  jamOperasional?: string;
  peralatanListrik?: string;
  catatan?: string;
};

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Record<string, string> };

export function validateElectricityInput(input: ElectricityInput): ValidationResult<ElectricityInput> {
  const errors: Record<string, string> = {};

  if (!input.namaUsaha.trim()) errors.namaUsaha = "Nama usaha wajib diisi.";
  if (!input.jenisUsaha.trim()) errors.jenisUsaha = "Jenis usaha wajib diisi.";
  if (!input.lokasiUsaha.trim()) errors.lokasiUsaha = "Lokasi usaha wajib diisi.";
  if (Number(input.rataRataTagihan) <= 0) errors.rataRataTagihan = "Tagihan listrik harus lebih dari Rp0.";
  if (Number(input.tagihanBulanLalu) <= 0) errors.tagihanBulanLalu = "Tagihan bulan lalu harus lebih dari Rp0.";

  if (Object.keys(errors).length) return { ok: false, errors };

  return {
    ok: true,
    data: {
      ...input,
      namaUsaha: input.namaUsaha.trim(),
      jenisUsaha: input.jenisUsaha.trim(),
      lokasiUsaha: input.lokasiUsaha.trim(),
    },
  };
}