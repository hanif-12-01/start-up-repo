import "server-only";
import { db } from "@/lib/db";
import type {
  Cashflow,
  CashflowDirection,
  CashflowStatus,
} from "@prisma/client";
import { requireBusinessMembership } from "@/services/membership";

/**
 * Cashflow service — semua fungsi di sini READ-ONLY.
 *
 * Rules yang ditegakkan lapisan ini:
 *   • Ownership: setiap read WAJIB lewat requireBusinessMembership().
 *   • Scope role:
 *       - BUSINESS_OWNER  → lihat semua cashflow di bisnis.
 *       - BUSINESS_STAFF  → hanya cashflow createdById = userId.
 *   • Soft-delete: baris dengan deletedAt != null tidak pernah dikembalikan.
 *   • BigInt: TIDAK PERNAH keluar dari service — semua boundary dikonversi
 *     via toUiCashflow / safeBigIntToNumber.
 *
 * Server actions (create/edit/approve/delete) belum dibuat di step ini.
 */

// ─────────────────────────────────────────────────────────────
// BigInt helpers
// ─────────────────────────────────────────────────────────────

/**
 * Konversi BigInt Prisma ke Number aman untuk boundary UI.
 *
 * Rupiah UMKM realistis (bahkan agregat tahunan) tidak akan pernah
 * melebihi Number.MAX_SAFE_INTEGER (~9 kuadriliun). Guard tetap dipasang
 * defensif — kalau nilai di luar batas aman, kita log peringatan dan
 * mengembalikan Number.MAX_SAFE_INTEGER agar UI tidak crash (lebih baik
 * over-report daripada NaN/precision-loss diam-diam).
 */
export function safeBigIntToNumber(
  value: bigint | number | null | undefined,
): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    console.warn(
      "[cashflow] BigInt melebihi MAX_SAFE_INTEGER — presisi hilang:",
      value.toString(),
    );
    return Number.MAX_SAFE_INTEGER;
  }
  if (value < BigInt(Number.MIN_SAFE_INTEGER)) {
    console.warn(
      "[cashflow] BigInt di bawah MIN_SAFE_INTEGER — presisi hilang:",
      value.toString(),
    );
    return Number.MIN_SAFE_INTEGER;
  }
  return Number(value);
}

// ─────────────────────────────────────────────────────────────
// UI DTO
// ─────────────────────────────────────────────────────────────

export interface UiCashflow {
  id: string;
  businessId: string;
  direction: CashflowDirection;
  type: Cashflow["type"];
  amountIdr: number;
  occurredAt: Date;
  month: number;
  year: number;
  description: string | null;
  referenceNo: string | null;
  source: Cashflow["source"];
  status: CashflowStatus;
  createdById: string;
  approvedById: string | null;
  approvedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toUiCashflow(cashflow: Cashflow): UiCashflow {
  return {
    id: cashflow.id,
    businessId: cashflow.businessId,
    direction: cashflow.direction,
    type: cashflow.type,
    amountIdr: safeBigIntToNumber(cashflow.amountIdr),
    occurredAt: cashflow.occurredAt,
    month: cashflow.month,
    year: cashflow.year,
    description: cashflow.description,
    referenceNo: cashflow.referenceNo,
    source: cashflow.source,
    status: cashflow.status,
    createdById: cashflow.createdById,
    approvedById: cashflow.approvedById,
    approvedAt: cashflow.approvedAt,
    rejectionReason: cashflow.rejectionReason,
    createdAt: cashflow.createdAt,
    updatedAt: cashflow.updatedAt,
  };
}

export function toUiCashflowList(cashflows: Cashflow[]): UiCashflow[] {
  return cashflows.map(toUiCashflow);
}

// ─────────────────────────────────────────────────────────────
// Read functions
// ─────────────────────────────────────────────────────────────

export interface GetCashflowsParams {
  userId: string;
  businessId: string;
  month?: number;
  year?: number;
  status?: CashflowStatus;
  direction?: CashflowDirection;
}

/**
 * Ambil daftar cashflow di sebuah bisnis untuk user tertentu.
 * Scope filter otomatis mengikuti role: staff hanya melihat baris miliknya.
 */
export async function getCashflowsForBusiness(
  params: GetCashflowsParams,
): Promise<UiCashflow[]> {
  const { userId, businessId, month, year, status, direction } = params;

  const membership = await requireBusinessMembership(userId, businessId);
  const isStaff = membership.role === "BUSINESS_STAFF";

  const cashflows = await db.cashflow.findMany({
    where: {
      businessId,
      deletedAt: null,
      ...(isStaff ? { createdById: userId } : {}),
      ...(month !== undefined ? { month } : {}),
      ...(year !== undefined ? { year } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(direction !== undefined ? { direction } : {}),
    },
    orderBy: [
      { occurredAt: "desc" },
      { createdAt: "desc" },
    ],
  });

  return toUiCashflowList(cashflows);
}

// ─────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────

export type CashFlowStatus = "SEHAT" | "WASPADA" | "KRITIS";

export interface MonthlyCashflowSummary {
  month: number;
  year: number;
  totalIncomeIdr: number;
  totalExpenseIdr: number;
  netCashflowIdr: number;
  marginPercent: number | null;
  cashFlowStatus: CashFlowStatus;
}

export interface GetMonthlyCashflowSummaryParams {
  userId: string;
  businessId: string;
  month: number;
  year: number;
}

/**
 * Klasifikasi kesehatan kas berdasarkan net & margin.
 *
 *   KRITIS   : net < 0 (pengeluaran lebih besar dari pemasukan).
 *   SEHAT    : net > 0 DAN margin >= 20% (untung yang layak).
 *   WASPADA  : net >= 0 tapi margin < 20%, atau income = 0 (margin null).
 *
 * Urutan pengecekan penting: KRITIS dulu supaya net negatif tidak nyasar
 * ke WASPADA saat margin null.
 */
function classifyCashFlowStatus(
  netCashflowIdr: number,
  marginPercent: number | null,
): CashFlowStatus {
  if (netCashflowIdr < 0) return "KRITIS";
  if (netCashflowIdr > 0 && marginPercent !== null && marginPercent >= 20) {
    return "SEHAT";
  }
  return "WASPADA";
}

export async function getMonthlyCashflowSummary(
  params: GetMonthlyCashflowSummaryParams,
): Promise<MonthlyCashflowSummary> {
  const { userId, businessId, month, year } = params;

  const membership = await requireBusinessMembership(userId, businessId);
  const isStaff = membership.role === "BUSINESS_STAFF";

  // Prisma groupBy per direction — satu query, sum aman utk BigInt.
  const grouped = await db.cashflow.groupBy({
    by: ["direction"],
    where: {
      businessId,
      month,
      year,
      status: "APPROVED",
      deletedAt: null,
      ...(isStaff ? { createdById: userId } : {}),
    },
    _sum: { amountIdr: true },
  });

  let totalIncomeIdr = 0;
  let totalExpenseIdr = 0;
  for (const row of grouped) {
    const value = safeBigIntToNumber(row._sum.amountIdr);
    if (row.direction === "IN") totalIncomeIdr = value;
    else if (row.direction === "OUT") totalExpenseIdr = value;
  }

  const netCashflowIdr = totalIncomeIdr - totalExpenseIdr;
  const marginPercent =
    totalIncomeIdr > 0
      ? Number(((netCashflowIdr / totalIncomeIdr) * 100).toFixed(2))
      : null;

  return {
    month,
    year,
    totalIncomeIdr,
    totalExpenseIdr,
    netCashflowIdr,
    marginPercent,
    cashFlowStatus: classifyCashFlowStatus(netCashflowIdr, marginPercent),
  };
}

export interface GetLatestCashflowSummaryParams {
  userId: string;
  businessId: string;
  month?: number;
  year?: number;
}

/**
 * Convenience wrapper: default ke bulan & tahun sekarang bila tidak
 * dispesifikkan. Berguna untuk kartu ringkasan dashboard.
 */
export async function getLatestCashflowSummaryForBusiness(
  params: GetLatestCashflowSummaryParams,
): Promise<MonthlyCashflowSummary> {
  const now = new Date();
  const month = params.month ?? now.getMonth() + 1;
  const year = params.year ?? now.getFullYear();

  return getMonthlyCashflowSummary({
    userId: params.userId,
    businessId: params.businessId,
    month,
    year,
  });
}
