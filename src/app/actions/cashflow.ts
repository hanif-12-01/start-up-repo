"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { safeError } from "@/lib/safe-log";
import {
  CashflowDirection,
  CashflowStatus,
  CashflowType,
} from "@prisma/client";
import { getBusinessMembership } from "@/services/membership";
import { toUiCashflow, type UiCashflow } from "@/services/cashflow";

/**
 * Server actions cashflow — write side.
 *
 * Rules yang ditegakkan lapisan ini (sekaligus di service `cashflow.ts` untuk
 * read side):
 *   • Sesi wajib. Non-login → "Anda harus login terlebih dahulu."
 *   • Membership wajib ACTIVE di businessId yang ditarget.
 *   • Role gating:
 *       - BUSINESS_OWNER  → boleh create/update/soft-delete/approve/reject
 *                            SEMUA cashflow di bisnis (kecuali edit AUTO_*).
 *       - BUSINESS_STAFF  → hanya create + edit/soft-delete cashflow miliknya
 *                            sendiri saat status DRAFT/PENDING_APPROVAL.
 *   • Cashflow default status:
 *       - dibuat OWNER → APPROVED (langsung masuk laporan).
 *       - dibuat STAFF → PENDING_APPROVAL (menunggu approve OWNER).
 *   • source AUTO_ELECTRICITY / AUTO_PREDICTION tidak boleh diedit manual
 *     (integritas jejak sistem). Soft-delete hanya boleh oleh OWNER.
 *   • deletedAt = soft delete. TIDAK PERNAH hard delete.
 *
 * Response konsisten:
 *   { success: true,  message, data?: UiCashflow }
 *   { success: false, message }
 * Semua pesan Bahasa Indonesia + generik (tidak bocor internal).
 */

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type CashflowActionResult =
  | { success: true; message: string; data?: UiCashflow }
  | { success: false; message: string };

export interface CreateCashflowInput {
  businessId: string;
  direction: CashflowDirection;
  type: CashflowType;
  amountIdr: number | string;
  occurredAt: string | Date;
  description?: string;
  referenceNo?: string;
}

export interface UpdateCashflowInput {
  id: string;
  direction?: CashflowDirection;
  type?: CashflowType;
  amountIdr?: number | string;
  occurredAt?: string | Date;
  description?: string | null;
  referenceNo?: string | null;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const CASHFLOW_PATHS = ["/dashboard/cashflow", "/dashboard"] as const;

function revalidateCashflowPaths() {
  for (const p of CASHFLOW_PATHS) revalidatePath(p);
}

function requireSessionUserId(session: unknown): string | null {
  const s = session as { user?: { id?: string } } | null;
  return s?.user?.id ?? null;
}

function parseOccurredAt(value: string | Date): Date | null {
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return null;
  return d;
}

/** Konversi input Rupiah (number/string) ke BigInt positif, atau null bila invalid. */
function parseAmountToBigInt(raw: number | string): bigint | null {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  const rounded = Math.round(n);
  if (rounded <= 0) return null;
  return BigInt(rounded);
}

function isValidDirection(v: unknown): v is CashflowDirection {
  return v === "IN" || v === "OUT";
}

const VALID_TYPES: CashflowType[] = [
  "SALES",
  "SERVICE_INCOME",
  "OTHER_INCOME",
  "ELECTRICITY_BILL",
  "RAW_MATERIAL",
  "SALARY",
  "RENT",
  "WATER",
  "INTERNET",
  "MAINTENANCE",
  "TRANSPORT",
  "OTHER_EXPENSE",
];

function isValidType(v: unknown): v is CashflowType {
  return typeof v === "string" && (VALID_TYPES as string[]).includes(v);
}

// ─────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────

export async function createCashflow(
  input: CreateCashflowInput,
): Promise<CashflowActionResult> {
  try {
    const session = await getServerSession(authOptions);
    const userId = requireSessionUserId(session);
    if (!userId) {
      return { success: false, message: "Anda harus login terlebih dahulu." };
    }

    // Validasi input
    if (typeof input.businessId !== "string" || input.businessId.trim() === "") {
      return { success: false, message: "Bisnis tidak valid." };
    }
    if (!isValidDirection(input.direction)) {
      return { success: false, message: "Arah kas (masuk/keluar) tidak valid." };
    }
    if (!isValidType(input.type)) {
      return { success: false, message: "Kategori transaksi tidak valid." };
    }
    const amountIdr = parseAmountToBigInt(input.amountIdr);
    if (amountIdr === null) {
      return { success: false, message: "Jumlah harus lebih dari Rp0." };
    }
    const occurredAt = parseOccurredAt(input.occurredAt);
    if (!occurredAt) {
      return { success: false, message: "Tanggal transaksi tidak valid." };
    }

    // Membership check
    const membership = await getBusinessMembership(userId, input.businessId);
    if (!membership) {
      return { success: false, message: "Anda tidak memiliki akses ke bisnis ini." };
    }

    // Status default berdasar role
    const status: CashflowStatus =
      membership.role === "BUSINESS_OWNER" ? "APPROVED" : "PENDING_APPROVAL";

    const month = occurredAt.getMonth() + 1;
    const year = occurredAt.getFullYear();

    const created = await db.cashflow.create({
      data: {
        businessId: input.businessId,
        direction: input.direction,
        type: input.type,
        amountIdr,
        occurredAt,
        month,
        year,
        description: input.description?.trim() || null,
        referenceNo: input.referenceNo?.trim() || null,
        source: "MANUAL",
        status,
        createdById: userId,
        // approvedById tetap null — owner tetap catat siapa yang input
        // (createdById), lapangan approve baru terisi lewat approveCashflow().
      },
    });

    revalidateCashflowPaths();

    return {
      success: true,
      message:
        status === "APPROVED"
          ? "Transaksi berhasil dicatat."
          : "Transaksi berhasil dikirim untuk persetujuan owner.",
      data: toUiCashflow(created),
    };
  } catch (error) {
    safeError("cashflow.create", error);
    return {
      success: false,
      message: "Terjadi kesalahan sistem saat mencatat transaksi. Silakan coba lagi.",
    };
  }
}

// ─────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────

export async function updateCashflow(
  input: UpdateCashflowInput,
): Promise<CashflowActionResult> {
  try {
    const session = await getServerSession(authOptions);
    const userId = requireSessionUserId(session);
    if (!userId) {
      return { success: false, message: "Anda harus login terlebih dahulu." };
    }
    if (typeof input.id !== "string" || input.id.trim() === "") {
      return { success: false, message: "Transaksi tidak valid." };
    }

    const existing = await db.cashflow.findFirst({
      where: { id: input.id, deletedAt: null },
    });
    if (!existing) {
      return { success: false, message: "Transaksi tidak ditemukan." };
    }

    const membership = await getBusinessMembership(userId, existing.businessId);
    if (!membership) {
      return { success: false, message: "Anda tidak memiliki akses ke bisnis ini." };
    }

    // AUTO_* tidak boleh diedit manual — jejak sistem harus tetap konsisten
    // dengan sumbernya (ElectricityEntry / PredictionResult).
    if (existing.source !== "MANUAL") {
      return {
        success: false,
        message: "Transaksi otomatis dari sistem tidak dapat diedit manual.",
      };
    }

    // Role-based gating
    if (membership.role === "BUSINESS_STAFF") {
      if (existing.createdById !== userId) {
        return {
          success: false,
          message: "Staff hanya dapat mengubah transaksi yang dibuat sendiri.",
        };
      }
      if (
        existing.status !== "DRAFT" &&
        existing.status !== "PENDING_APPROVAL"
      ) {
        return {
          success: false,
          message: "Transaksi yang sudah disetujui/ditolak tidak dapat diubah oleh staff.",
        };
      }
    }

    // Susun payload update — hanya field yang dikirim
    const data: {
      direction?: CashflowDirection;
      type?: CashflowType;
      amountIdr?: bigint;
      occurredAt?: Date;
      month?: number;
      year?: number;
      description?: string | null;
      referenceNo?: string | null;
    } = {};

    if (input.direction !== undefined) {
      if (!isValidDirection(input.direction)) {
        return { success: false, message: "Arah kas (masuk/keluar) tidak valid." };
      }
      data.direction = input.direction;
    }

    if (input.type !== undefined) {
      if (!isValidType(input.type)) {
        return { success: false, message: "Kategori transaksi tidak valid." };
      }
      data.type = input.type;
    }

    if (input.amountIdr !== undefined) {
      const amt = parseAmountToBigInt(input.amountIdr);
      if (amt === null) {
        return { success: false, message: "Jumlah harus lebih dari Rp0." };
      }
      data.amountIdr = amt;
    }

    if (input.occurredAt !== undefined) {
      const d = parseOccurredAt(input.occurredAt);
      if (!d) {
        return { success: false, message: "Tanggal transaksi tidak valid." };
      }
      data.occurredAt = d;
      data.month = d.getMonth() + 1;
      data.year = d.getFullYear();
    }

    if (input.description !== undefined) {
      data.description = input.description?.trim() || null;
    }
    if (input.referenceNo !== undefined) {
      data.referenceNo = input.referenceNo?.trim() || null;
    }

    if (Object.keys(data).length === 0) {
      return { success: false, message: "Tidak ada perubahan untuk disimpan." };
    }

    const updated = await db.cashflow.update({
      where: { id: existing.id },
      data,
    });

    revalidateCashflowPaths();

    return {
      success: true,
      message: "Transaksi berhasil diperbarui.",
      data: toUiCashflow(updated),
    };
  } catch (error) {
    safeError("cashflow.update", error);
    return {
      success: false,
      message: "Terjadi kesalahan sistem saat memperbarui transaksi. Silakan coba lagi.",
    };
  }
}

// ─────────────────────────────────────────────────────────────
// DELETE (soft)
// ─────────────────────────────────────────────────────────────

export async function deleteCashflow(
  id: string,
): Promise<CashflowActionResult> {
  try {
    const session = await getServerSession(authOptions);
    const userId = requireSessionUserId(session);
    if (!userId) {
      return { success: false, message: "Anda harus login terlebih dahulu." };
    }
    if (typeof id !== "string" || id.trim() === "") {
      return { success: false, message: "Transaksi tidak valid." };
    }

    const existing = await db.cashflow.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      return { success: false, message: "Transaksi tidak ditemukan." };
    }

    const membership = await getBusinessMembership(userId, existing.businessId);
    if (!membership) {
      return { success: false, message: "Anda tidak memiliki akses ke bisnis ini." };
    }

    if (membership.role === "BUSINESS_STAFF") {
      // Staff hanya boleh soft-delete miliknya sendiri, dan hanya sebelum
      // disetujui / ditolak. Wajib source MANUAL.
      if (existing.source !== "MANUAL") {
        return {
          success: false,
          message: "Transaksi otomatis dari sistem hanya bisa dihapus oleh owner.",
        };
      }
      if (existing.createdById !== userId) {
        return {
          success: false,
          message: "Staff hanya dapat menghapus transaksi yang dibuat sendiri.",
        };
      }
      if (
        existing.status !== "DRAFT" &&
        existing.status !== "PENDING_APPROVAL"
      ) {
        return {
          success: false,
          message: "Transaksi yang sudah disetujui/ditolak tidak dapat dihapus oleh staff.",
        };
      }
    }
    // Owner: boleh soft-delete MANUAL & AUTO_* di bisnisnya.

    const deleted = await db.cashflow.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });

    revalidateCashflowPaths();

    return {
      success: true,
      message: "Transaksi berhasil dihapus.",
      data: toUiCashflow(deleted),
    };
  } catch (error) {
    safeError("cashflow.delete", error);
    return {
      success: false,
      message: "Terjadi kesalahan sistem saat menghapus transaksi. Silakan coba lagi.",
    };
  }
}

// ─────────────────────────────────────────────────────────────
// APPROVE
// ─────────────────────────────────────────────────────────────

export async function approveCashflow(
  id: string,
): Promise<CashflowActionResult> {
  try {
    const session = await getServerSession(authOptions);
    const userId = requireSessionUserId(session);
    if (!userId) {
      return { success: false, message: "Anda harus login terlebih dahulu." };
    }
    if (typeof id !== "string" || id.trim() === "") {
      return { success: false, message: "Transaksi tidak valid." };
    }

    const existing = await db.cashflow.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      return { success: false, message: "Transaksi tidak ditemukan." };
    }

    const membership = await getBusinessMembership(userId, existing.businessId);
    if (!membership || membership.role !== "BUSINESS_OWNER") {
      return {
        success: false,
        message: "Hanya owner bisnis yang dapat menyetujui transaksi.",
      };
    }

    if (existing.status !== "PENDING_APPROVAL") {
      return {
        success: false,
        message: "Hanya transaksi berstatus menunggu persetujuan yang dapat disetujui.",
      };
    }

    const approved = await db.cashflow.update({
      where: { id: existing.id },
      data: {
        status: "APPROVED",
        approvedById: userId,
        approvedAt: new Date(),
        rejectionReason: null,
      },
    });

    revalidateCashflowPaths();

    return {
      success: true,
      message: "Transaksi berhasil disetujui.",
      data: toUiCashflow(approved),
    };
  } catch (error) {
    safeError("cashflow.approve", error);
    return {
      success: false,
      message: "Terjadi kesalahan sistem saat menyetujui transaksi. Silakan coba lagi.",
    };
  }
}

// ─────────────────────────────────────────────────────────────
// REJECT
// ─────────────────────────────────────────────────────────────

export async function rejectCashflow(
  id: string,
  rejectionReason: string,
): Promise<CashflowActionResult> {
  try {
    const session = await getServerSession(authOptions);
    const userId = requireSessionUserId(session);
    if (!userId) {
      return { success: false, message: "Anda harus login terlebih dahulu." };
    }
    if (typeof id !== "string" || id.trim() === "") {
      return { success: false, message: "Transaksi tidak valid." };
    }
    const reason = typeof rejectionReason === "string" ? rejectionReason.trim() : "";
    if (reason === "") {
      return { success: false, message: "Alasan penolakan wajib diisi." };
    }

    const existing = await db.cashflow.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      return { success: false, message: "Transaksi tidak ditemukan." };
    }

    const membership = await getBusinessMembership(userId, existing.businessId);
    if (!membership || membership.role !== "BUSINESS_OWNER") {
      return {
        success: false,
        message: "Hanya owner bisnis yang dapat menolak transaksi.",
      };
    }

    if (existing.status !== "PENDING_APPROVAL") {
      return {
        success: false,
        message: "Hanya transaksi berstatus menunggu persetujuan yang dapat ditolak.",
      };
    }

    const rejected = await db.cashflow.update({
      where: { id: existing.id },
      data: {
        status: "REJECTED",
        approvedById: userId,
        approvedAt: new Date(),
        rejectionReason: reason,
      },
    });

    revalidateCashflowPaths();

    return {
      success: true,
      message: "Transaksi berhasil ditolak.",
      data: toUiCashflow(rejected),
    };
  } catch (error) {
    safeError("cashflow.reject", error);
    return {
      success: false,
      message: "Terjadi kesalahan sistem saat menolak transaksi. Silakan coba lagi.",
    };
  }
}
