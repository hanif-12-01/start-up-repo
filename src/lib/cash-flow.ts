/**
 * Utility murni untuk analitik cash flow sederhana.
 *
 * Tanggung jawab file ini:
 *   - Menghitung rasio biaya listrik terhadap pendapatan.
 *   - Menghitung sisa pendapatan setelah dikurangi biaya listrik.
 *   - Menghitung skenario "kalau saja bisa hemat" (bill setelah hemat + sisa
 *     pendapatan potensial setelah hemat).
 *   - Mengklasifikasikan rasio listrik ke level risiko per sektor UMKM.
 *
 * Aturan wajib:
 *   - File ini framework-independent: tidak boleh import Next.js, React,
 *     Prisma client, atau I/O apa pun. Aman dipanggil dari service, server
 *     action, RSC, komponen client, atau unit test.
 *   - Tidak menghitung "laba bersih" / "profit bersih". Fokus MVP hanya pada
 *     dampak biaya listrik terhadap pendapatan (omzet).
 *   - Semua label & deskripsi dalam Bahasa Indonesia.
 */

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type CashFlowBusinessType =
  | "LAUNDRY"
  | "FNB"
  | "RETAIL"
  | "MANUFACTURE"
  | "COLD_STORAGE"
  | "OTHER";

export type ElectricityRevenueStatus =
  | "AMAN"
  | "PERLU_DIPANTAU"
  | "TINGGI"
  | "RISIKO_TINGGI"
  | "BELUM_ADA_DATA";

export interface ElectricityRevenueClassification {
  status: ElectricityRevenueStatus;
  label: string;
  description: string;
  /** 1 = paling ringan, 4 = paling berat; 0 = belum ada data. */
  severity: 0 | 1 | 2 | 3 | 4;
}

// ─────────────────────────────────────────────────────────────
// Perhitungan dasar
// ─────────────────────────────────────────────────────────────

/**
 * Rasio biaya listrik terhadap pendapatan (persen).
 * Return null bila pendapatan tidak positif — biar caller bisa tampilkan "—"
 * tanpa risiko pembagian nol / infinity.
 */
export function calculateElectricityRevenueRatio(
  revenueIdr: number,
  electricityCostIdr: number,
): number | null {
  if (!Number.isFinite(revenueIdr) || revenueIdr <= 0) return null;
  if (!Number.isFinite(electricityCostIdr) || electricityCostIdr < 0) return 0;
  return (electricityCostIdr / revenueIdr) * 100;
}

/**
 * Sisa pendapatan setelah dikurangi biaya listrik.
 * Boleh negatif — mengindikasikan biaya listrik melampaui pendapatan
 * (skenario ekstrem yang justru wajib dilaporkan apa adanya, bukan di-clamp).
 */
export function calculateRemainingRevenueAfterElectricity(
  revenueIdr: number,
  electricityCostIdr: number,
): number {
  const r = Number.isFinite(revenueIdr) ? revenueIdr : 0;
  const e = Number.isFinite(electricityCostIdr) ? electricityCostIdr : 0;
  return r - e;
}

/**
 * Estimasi tagihan listrik jika saran hemat diterapkan.
 * Dijaga tidak turun di bawah 0 (tagihan negatif tidak masuk akal).
 */
export function calculateBillAfterSavings(
  electricityCostIdr: number,
  potentialSavingsIdr: number,
): number {
  const cost = Number.isFinite(electricityCostIdr) ? electricityCostIdr : 0;
  const savings = Number.isFinite(potentialSavingsIdr) ? Math.max(0, potentialSavingsIdr) : 0;
  return Math.max(0, cost - savings);
}

/**
 * Potensi sisa pendapatan setelah biaya listrik "kalau saja" hemat diterapkan.
 * Berguna untuk kartu "Potensi Sisa Pendapatan Setelah Hemat".
 */
export function calculatePotentialRemainingRevenueAfterSavings(
  revenueIdr: number,
  electricityCostIdr: number,
  potentialSavingsIdr: number,
): number {
  const billAfter = calculateBillAfterSavings(electricityCostIdr, potentialSavingsIdr);
  return calculateRemainingRevenueAfterElectricity(revenueIdr, billAfter);
}

// ─────────────────────────────────────────────────────────────
// Klasifikasi risiko per sektor UMKM
// ─────────────────────────────────────────────────────────────

interface SectorThreshold {
  aman: number;           // <= aman → AMAN
  perluDipantau: number;  // > aman & <= perluDipantau → PERLU_DIPANTAU
  tinggi: number;         // > perluDipantau & <= tinggi → TINGGI
                          // > tinggi → RISIKO_TINGGI
}

const THRESHOLDS: Record<CashFlowBusinessType, SectorThreshold> = {
  LAUNDRY:      { aman: 8,  perluDipantau: 12, tinggi: 18 },
  COLD_STORAGE: { aman: 10, perluDipantau: 15, tinggi: 22 },
  FNB:          { aman: 6,  perluDipantau: 10, tinggi: 15 },
  RETAIL:       { aman: 5,  perluDipantau: 8,  tinggi: 12 },
  MANUFACTURE:  { aman: 8,  perluDipantau: 13, tinggi: 20 },
  OTHER:        { aman: 5,  perluDipantau: 10, tinggi: 15 },
};

const CLASSIFICATION_META: Record<
  ElectricityRevenueStatus,
  { label: string; description: string; severity: 0 | 1 | 2 | 3 | 4 }
> = {
  AMAN: {
    label: "Aman",
    description:
      "Biaya listrik masih dalam batas wajar untuk sektor usaha Anda. Pertahankan pola pemakaian saat ini.",
    severity: 1,
  },
  PERLU_DIPANTAU: {
    label: "Perlu Dipantau",
    description:
      "Rasio biaya listrik mulai naik. Awasi pemakaian alat berdaya besar dan pertimbangkan tips hemat sederhana.",
    severity: 2,
  },
  TINGGI: {
    label: "Tinggi",
    description:
      "Biaya listrik menekan pendapatan cukup besar. Tinjau jadwal operasional dan cek anomali pemakaian.",
    severity: 3,
  },
  RISIKO_TINGGI: {
    label: "Risiko Tinggi",
    description:
      "Biaya listrik mendominasi pendapatan. Segera terapkan rekomendasi hemat untuk melindungi kas usaha.",
    severity: 4,
  },
  BELUM_ADA_DATA: {
    label: "Belum Ada Data",
    description:
      "Isi pendapatan bulan ini agar sistem dapat menghitung rasio biaya listrik terhadap pendapatan.",
    severity: 0,
  },
};

/**
 * Klasifikasikan rasio biaya listrik terhadap pendapatan ke level risiko
 * yang berbeda per sektor UMKM (lebih ketat untuk retail, lebih longgar untuk
 * cold storage / manufacture).
 *
 * Ambang berdasar spesifikasi produk:
 *   LAUNDRY      : ≤8 Aman · >8-12 Perlu · >12-18 Tinggi · >18 Risiko
 *   COLD_STORAGE : ≤10 Aman · >10-15 Perlu · >15-22 Tinggi · >22 Risiko
 *   FNB          : ≤6 Aman · >6-10 Perlu · >10-15 Tinggi · >15 Risiko
 *   RETAIL       : ≤5 Aman · >5-8 Perlu · >8-12 Tinggi · >12 Risiko
 *   MANUFACTURE  : ≤8 Aman · >8-13 Perlu · >13-20 Tinggi · >20 Risiko
 *   OTHER        : ≤5 Aman · >5-10 Perlu · >10-15 Tinggi · >15 Risiko
 *
 * `ratioPercent` boleh null (kasus pendapatan belum diisi) — akan menghasilkan
 * status BELUM_ADA_DATA supaya UI konsisten tanpa perlu branching manual.
 */
export function classifyElectricityRevenueRatio(
  ratioPercent: number | null | undefined,
  businessType: CashFlowBusinessType,
): ElectricityRevenueClassification {
  if (ratioPercent === null || ratioPercent === undefined || !Number.isFinite(ratioPercent)) {
    return { status: "BELUM_ADA_DATA", ...CLASSIFICATION_META.BELUM_ADA_DATA };
  }

  const t = THRESHOLDS[businessType] ?? THRESHOLDS.OTHER;

  let status: ElectricityRevenueStatus;
  if (ratioPercent <= t.aman) status = "AMAN";
  else if (ratioPercent <= t.perluDipantau) status = "PERLU_DIPANTAU";
  else if (ratioPercent <= t.tinggi) status = "TINGGI";
  else status = "RISIKO_TINGGI";

  return { status, ...CLASSIFICATION_META[status] };
}

// ─────────────────────────────────────────────────────────────
// Tipe untuk data-flow analitik dashboard
// (dipakai bersama antara server page & client component tanpa
// mem-bundle service server-only ke client.)
// ─────────────────────────────────────────────────────────────

export interface CashFlowAnalyticsTrendPoint {
  month: number;
  year: number;
  label: string;
  revenueIdr: number;
  /** null bila `ElectricityEntry` untuk periode ini belum ada. */
  electricityCostIdr: number | null;
}

export interface CashFlowAnalytics {
  hasRevenueData: boolean;
  revenueIdr: number | null;
  electricityCostIdr: number | null;
  /**
   * Label sumber biaya listrik:
   *  - "Tagihan listrik tercatat"  → dari ElectricityEntry.costIdr.
   *  - "Estimasi tagihan listrik"  → dari PredictionResult.predictedCostIdr.
   *  - null                         → kedua sumber belum ada.
   */
  electricityCostLabel: string | null;
  ratioPercent: number | null;
  ratioStatus: ElectricityRevenueClassification;
  remainingRevenueIdr: number | null;
  potentialSavingsIdr: number;
  estimatedBillAfterSavingsIdr: number | null;
  potentialRemainingRevenueIdr: number | null;
  trend: CashFlowAnalyticsTrendPoint[];
}
