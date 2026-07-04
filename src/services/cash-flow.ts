import "server-only";
import { db } from "@/lib/db";
import type { CashFlowEntry } from "@prisma/client";

/**
 * Service CashFlowEntry — snapshot pendapatan (omzet) bulanan bisnis.
 *
 * Tanggung jawab file ini:
 *   - Baca & tulis CashFlowEntry berdasarkan businessId (+ month/year).
 *   - Menyediakan data trend gabungan (revenue vs biaya listrik) untuk chart.
 *
 * Batasan:
 *   - SEMUA fungsi hanya menerima `businessId` — validasi kepemilikan
 *     (session/user/membership) WAJIB dilakukan di server action atau page
 *     yang memanggil service ini. Service tidak tahu tentang session.
 *   - Nol side-effect UI, nol localStorage, nol I/O selain Prisma.
 *
 * Catatan tipe:
 *   Field angka pakai `number` (Float di schema). Tidak ada BigInt di sini —
 *   beda dengan `services/cashflow.ts` (transaksi harian) yang pakai BigInt.
 *   Konvensi ini disamakan dengan `ElectricityEntry.costIdr` (juga Float).
 */

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface UpsertCashFlowEntryInput {
  businessId: string;
  month: number; // 1..12
  year: number;
  revenueIdr: number;
  grossProfitIdr?: number | null;
  marginPercent?: number | null;
  otherOperationalCostIdr?: number | null;
  notes?: string | null;
}

export interface CashFlowTrendPoint {
  month: number;
  year: number;
  label: string;
  revenueIdr: number;
  /** null bila ElectricityEntry untuk (year, month) belum ada. */
  electricityCostIdr: number | null;
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const BULAN_LABEL_SINGKAT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

function periodLabel(month: number, year: number): string {
  const idx = Math.max(0, Math.min(11, month - 1));
  return `${BULAN_LABEL_SINGKAT[idx]} ${year}`;
}

// ─────────────────────────────────────────────────────────────
// Reads
// ─────────────────────────────────────────────────────────────

/**
 * Ambil semua entry pendapatan bisnis, terbaru dulu.
 * Cocok untuk tabel history di halaman analitik.
 */
export async function getCashFlowEntriesForBusiness(
  businessId: string,
): Promise<CashFlowEntry[]> {
  if (!businessId) return [];
  return db.cashFlowEntry.findMany({
    where: { businessId },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
}

/**
 * Ambil entry untuk (businessId, month, year) tertentu, atau null.
 * Cocok untuk pre-fill form edit / cek "apakah bulan ini sudah diisi".
 */
export async function getCashFlowEntryForPeriod(
  businessId: string,
  month: number,
  year: number,
): Promise<CashFlowEntry | null> {
  if (!businessId) return null;
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  if (!Number.isInteger(year)) return null;
  return db.cashFlowEntry.findUnique({
    where: {
      businessId_year_month: { businessId, year, month },
    },
  });
}

/**
 * Ambil entry pendapatan terbaru untuk bisnis (paling anyar berdasarkan
 * year+month, bukan createdAt — supaya kalau user backdate input pun,
 * "terbaru" tetap berarti periode terbaru).
 */
export async function getLatestCashFlowEntry(
  businessId: string,
): Promise<CashFlowEntry | null> {
  if (!businessId) return null;
  return db.cashFlowEntry.findFirst({
    where: { businessId },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
}

// ─────────────────────────────────────────────────────────────
// Writes
// ─────────────────────────────────────────────────────────────

/**
 * Upsert satu entry pendapatan bulanan. Idempoten via composite unique
 * (businessId, year, month) — panggilan berulang untuk periode yang sama
 * tidak menghasilkan duplikat, hanya update.
 *
 * Field opsional yang bernilai `undefined` di input akan diabaikan Prisma;
 * field opsional yang bernilai `null` akan meng-clear kolom (untuk hapus
 * catatan lama, dst).
 */
export async function upsertCashFlowEntry(
  input: UpsertCashFlowEntryInput,
): Promise<CashFlowEntry> {
  const {
    businessId,
    month,
    year,
    revenueIdr,
    grossProfitIdr,
    marginPercent,
    otherOperationalCostIdr,
    notes,
  } = input;

  return db.cashFlowEntry.upsert({
    where: {
      businessId_year_month: { businessId, year, month },
    },
    create: {
      businessId,
      month,
      year,
      revenueIdr,
      grossProfitIdr: grossProfitIdr ?? null,
      marginPercent: marginPercent ?? null,
      otherOperationalCostIdr: otherOperationalCostIdr ?? null,
      notes: notes ?? null,
    },
    update: {
      revenueIdr,
      // undefined → Prisma abaikan (tidak overwrite dengan null)
      grossProfitIdr,
      marginPercent,
      otherOperationalCostIdr,
      notes,
    },
  });
}

// ─────────────────────────────────────────────────────────────
// Trend (untuk chart di halaman analitik)
// ─────────────────────────────────────────────────────────────

/**
 * Data untuk chart trend: satu titik per CashFlowEntry, urut kronologis
 * (lama → baru — cocok untuk sumbu X di line/bar chart Recharts).
 *
 * `electricityCostIdr` diambil dari `ElectricityEntry` yang match berdasarkan
 * (businessId, year, month). Kalau tidak ada match → null (chart bisa render
 * gap / marker "Belum diisi").
 *
 * Implementasi: dua query paralel + merge di memory dengan Map — O(n + m).
 * Tidak pakai raw SQL / view supaya tetap portable dan mudah ditest.
 */
export async function getCashFlowTrendData(
  businessId: string,
): Promise<CashFlowTrendPoint[]> {
  if (!businessId) return [];

  const [entries, electricity] = await Promise.all([
    db.cashFlowEntry.findMany({
      where: { businessId },
      orderBy: [{ year: "asc" }, { month: "asc" }],
      select: { month: true, year: true, revenueIdr: true },
    }),
    db.electricityEntry.findMany({
      where: { businessId },
      select: { month: true, year: true, costIdr: true },
    }),
  ]);

  const electricityByPeriod = new Map<string, number>();
  for (const e of electricity) {
    electricityByPeriod.set(`${e.year}-${e.month}`, e.costIdr);
  }

  return entries.map((e) => ({
    month: e.month,
    year: e.year,
    label: periodLabel(e.month, e.year),
    revenueIdr: e.revenueIdr,
    electricityCostIdr:
      electricityByPeriod.get(`${e.year}-${e.month}`) ?? null,
  }));
}
