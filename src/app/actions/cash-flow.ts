"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";
import type { CashFlowEntry } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { getActiveBusinessId } from "@/services/business";
import { getBusinessMembership } from "@/services/membership";
import { upsertCashFlowEntry } from "@/services/cash-flow";
import { safeError } from "@/lib/safe-log";

/**
 * Server action untuk menyimpan snapshot pendapatan (omzet) bulanan.
 *
 * Alur:
 *   1. session guard (WAJIB login).
 *   2. active businessId dari cookie (WAJIB ada usaha).
 *   3. membership check (WAJIB anggota ACTIVE bisnis tersebut) — meski
 *      layer 2 sudah memfilter by userId, kita re-check membership sebagai
 *      defense-in-depth (konsisten dengan pola cashflow/prediction action).
 *   4. Zod validation (Bahasa Indonesia).
 *   5. Panggil service upsert (idempoten via composite unique).
 *   6. revalidate 3 path yang relevan.
 *
 * Response konsisten dengan cashflow action:
 *   { success: true,  message, data }
 *   { success: false, message }
 */

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type CashFlowEntryActionResult =
  | { success: true; message: string; data: CashFlowEntry }
  | { success: false; message: string };

// ─────────────────────────────────────────────────────────────
// Zod schema
// ─────────────────────────────────────────────────────────────

const cashFlowEntrySchema = z.object({
  month: z
    .number({ message: "Bulan wajib berupa angka." })
    .int({ message: "Bulan harus bilangan bulat." })
    .min(1, { message: "Bulan minimal 1." })
    .max(12, { message: "Bulan maksimal 12." }),
  year: z
    .number({ message: "Tahun wajib berupa angka." })
    .int({ message: "Tahun harus bilangan bulat." })
    .min(2020, { message: "Tahun minimal 2020." })
    .max(2100, { message: "Tahun maksimal 2100." }),
  revenueIdr: z
    .number({ message: "Pendapatan wajib berupa angka." })
    .finite({ message: "Pendapatan tidak valid." })
    .positive({ message: "Pendapatan harus lebih dari Rp0." }),
  grossProfitIdr: z
    .number()
    .finite()
    .min(0, { message: "Laba kotor tidak boleh negatif." })
    .nullish(),
  marginPercent: z
    .number()
    .finite()
    .min(0, { message: "Margin minimal 0%." })
    .max(100, { message: "Margin maksimal 100%." })
    .nullish(),
  otherOperationalCostIdr: z
    .number()
    .finite()
    .min(0, { message: "Biaya operasional lain tidak boleh negatif." })
    .nullish(),
  notes: z
    .string()
    .trim()
    .max(500, { message: "Catatan maksimal 500 karakter." })
    .nullish(),
});

// ─────────────────────────────────────────────────────────────
// Paths yang di-refresh setelah upsert sukses
// ─────────────────────────────────────────────────────────────
// - /dashboard              : kartu ringkasan rasio listrik/pendapatan.
// - /dashboard/pendapatan   : halaman analitik cash flow (dibuat Task 5+).
// - /dashboard/laporan      : ringkasan bulanan (PDF summary).
// revalidatePath pada route yang belum ada = no-op (aman).
const REVALIDATE_PATHS = [
  "/dashboard",
  "/dashboard/pendapatan",
  "/dashboard/laporan",
] as const;

// ─────────────────────────────────────────────────────────────
// Action
// ─────────────────────────────────────────────────────────────

export async function createOrUpdateCashFlowEntry(
  input: unknown,
): Promise<CashFlowEntryActionResult> {
  try {
    // 1. Session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return {
        success: false,
        message: "Anda harus login terlebih dahulu.",
      };
    }

    // 2. Active business
    const activeBusinessId = await getActiveBusinessId(session.user.id);
    if (!activeBusinessId) {
      return {
        success: false,
        message:
          "Belum ada usaha aktif. Silakan pilih atau lengkapi profil usaha terlebih dahulu.",
      };
    }

    // 3. Ownership / membership check
    const membership = await getBusinessMembership(
      session.user.id,
      activeBusinessId,
    );
    if (!membership) {
      return {
        success: false,
        message: "Anda tidak memiliki akses ke bisnis ini.",
      };
    }

    // 4. Validasi input
    const parsed = cashFlowEntrySchema.safeParse(input);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return {
        success: false,
        message: firstIssue?.message ?? "Data yang dikirim tidak valid.",
      };
    }

    // 5. Upsert via service
    const entry = await upsertCashFlowEntry({
      businessId: activeBusinessId,
      month: parsed.data.month,
      year: parsed.data.year,
      revenueIdr: parsed.data.revenueIdr,
      grossProfitIdr: parsed.data.grossProfitIdr ?? undefined,
      marginPercent: parsed.data.marginPercent ?? undefined,
      otherOperationalCostIdr: parsed.data.otherOperationalCostIdr ?? undefined,
      notes: parsed.data.notes ?? undefined,
    });

    // 6. Refresh RSC di path terkait
    for (const path of REVALIDATE_PATHS) {
      revalidatePath(path);
    }

    return {
      success: true,
      message: "Data pendapatan bulanan berhasil disimpan.",
      data: entry,
    };
  } catch (error) {
    // Sengaja tidak expose stack/error asli ke client — cukup log server-side.
    safeError("cashFlowEntry.createOrUpdate", error);
    return {
      success: false,
      message:
        "Terjadi kesalahan sistem saat menyimpan data pendapatan. Silakan coba lagi.",
    };
  }
}
