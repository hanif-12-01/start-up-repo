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
    const analysis = await runElectricityAnalysis(
      business.id,
      input.month,
      input.year,
      input.usageKwh,
      input.costIdr
    );

    // Save/update analysis result with the rule engine output
    await db.analysisResult.upsert({
      where: {
        businessId_year_month: {
          businessId: business.id,
          year: input.year,
          month: input.month,
        },
      },
      update: {
        totalUsageKwh: input.usageKwh,
        totalCostIdr: input.costIdr,
        avgDailyKwh: analysis.avgDailyKwh,
        carbonKg: analysis.carbonKg,
        efficiencyScore: analysis.efficiencyScore,
      },
      create: {
        businessId: business.id,
        month: input.month,
        year: input.year,
        totalUsageKwh: input.usageKwh,
        totalCostIdr: input.costIdr,
        avgDailyKwh: analysis.avgDailyKwh,
        carbonKg: analysis.carbonKg,
        efficiencyScore: analysis.efficiencyScore,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/input");
    revalidatePath("/dashboard/laporan");

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