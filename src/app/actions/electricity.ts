"use server";

import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getActiveBusinessId } from "@/services/business";
import { buildElectricityDataQualityWarnings } from "@/services/electricity-data-quality";
import { safeError } from "@/lib/safe-log";

export interface ElectricityInput {
  month: number;
  year: number;
  usageKwh: number;
  costIdr: number;
  confirmWarnings?: boolean;
}

type ElectricityActionResult =
  | { success: true; entryId: string }
  | { success: false; error: string; requiresConfirmation?: false }
  | { success: false; error: string; requiresConfirmation: true; warnings: string[] };

export async function createElectricityEntry(input: ElectricityInput): Promise<ElectricityActionResult> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return { success: false, error: "Sesi tidak valid. Silakan login kembali." };
    }

    const activeBusinessId = await getActiveBusinessId(session.user.id);
    if (!activeBusinessId) {
      return { success: false, error: "Sesi usaha tidak valid. Silakan pilih usaha Anda." };
    }

    // Get active business
    const business = await db.business.findFirst({
      where: { id: activeBusinessId, userId: session.user.id },
    });

    if (!business) {
      return { success: false, error: "Data usaha tidak ditemukan. Selesaikan profil usaha terlebih dahulu." };
    }

    const maxYear = new Date().getFullYear() + 1;
    if (!Number.isInteger(input.month) || input.month < 1 || input.month > 12) {
      return { success: false, error: "Bulan pemakaian tidak valid." };
    }

    if (!Number.isInteger(input.year) || input.year < 2020 || input.year > maxYear) {
      return { success: false, error: "Tahun pemakaian tidak valid." };
    }

    if (!Number.isFinite(input.usageKwh) || input.usageKwh <= 0) {
      return { success: false, error: "Pemakaian kWh harus lebih dari 0." };
    }

    if (!Number.isFinite(input.costIdr) || input.costIdr <= 0) {
      return { success: false, error: "Biaya listrik harus lebih dari Rp0." };
    }

    const duplicate = await db.electricityEntry.findUnique({
      where: {
        businessId_year_month: {
          businessId: business.id,
          year: input.year,
          month: input.month,
        },
      },
      select: { id: true },
    });

    if (duplicate) {
      return {
        success: false,
        error: "Data listrik untuk bulan dan tahun ini sudah ada. Pilih periode lain atau hapus data lama terlebih dahulu.",
      };
    }

    const previousEntries = await db.electricityEntry.findMany({
      where: { businessId: business.id },
      orderBy: [{ year: "asc" }, { month: "asc" }],
      select: { month: true, year: true, usageKwh: true, costIdr: true },
    });
    const warnings = buildElectricityDataQualityWarnings(input, previousEntries);

    if (warnings.length > 0 && input.confirmWarnings !== true) {
      return {
        success: false,
        error: "Data terlihat tidak biasa. Periksa peringatan sebelum menyimpan.",
        requiresConfirmation: true,
        warnings,
      };
    }

    const entry = await db.electricityEntry.create({
      data: {
        businessId: business.id,
        month: input.month,
        year: input.year,
        usageKwh: input.usageKwh,
        costIdr: input.costIdr,
      },
    });

    // Import and execute the rule-based analysis engine
    const { runElectricityAnalysis } = await import("@/lib/analysis");
    await runElectricityAnalysis(
      business.id,
      input.month,
      input.year,
      input.usageKwh,
      input.costIdr
    );

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/input");
    revalidatePath("/dashboard/laporan");
    revalidatePath("/dashboard/anomali");
    revalidatePath("/dashboard/rekomendasi");
    revalidatePath("/dashboard/prediksi");

    return { success: true, entryId: entry.id };
  } catch (error: any) {
    safeError("electricityEntry", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        success: false,
        error: "Data listrik untuk bulan dan tahun ini sudah ada. Pilih periode lain atau hapus data lama terlebih dahulu.",
      };
    }

    return { success: false, error: error.message || "Gagal menyimpan data listrik." };
  }
}

/**
 * Server action to explicitly regenerate the electricity analysis on-demand
 * for the active business's latest entry.
 */
export async function generateAnalysisAction(): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return { success: false, error: "Sesi tidak valid. Silakan login kembali." };
    }

    const activeBusinessId = await getActiveBusinessId(session.user.id);
    if (!activeBusinessId) {
      return { success: false, error: "Sesi usaha tidak valid. Silakan pilih usaha Anda." };
    }

    // Find the latest electricity entry for this business
    const latestEntry = await db.electricityEntry.findFirst({
      where: { businessId: activeBusinessId },
      orderBy: [
        { year: "desc" },
        { month: "desc" }
      ]
    });

    if (!latestEntry) {
      return { success: false, error: "Belum ada data listrik untuk dianalisis. Silakan masukkan data listrik terlebih dahulu." };
    }

    // Import and execute the rule-based analysis engine
    // (engine saves AnalysisResult, Anomaly, Recommendation, MonthlyReport to DB)
    const { runElectricityAnalysis } = await import("@/lib/analysis");
    await runElectricityAnalysis(
      activeBusinessId,
      latestEntry.month,
      latestEntry.year,
      latestEntry.usageKwh,
      latestEntry.costIdr
    );

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/input");
    revalidatePath("/dashboard/laporan");
    revalidatePath("/dashboard/anomali");
    revalidatePath("/dashboard/rekomendasi");
    revalidatePath("/dashboard/prediksi");

    return { success: true };
  } catch (error: any) {
    safeError("generateAnalysisAction", error);
    return { success: false, error: error.message || "Gagal memperbarui analisis." };
  }
}
