"use server";

import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { RiskLevel, RecommendationDifficulty } from "@prisma/client";

export interface ElectricityInput {
  month: number;
  year: number;
  usageKwh: number;
  costIdr: number;
}

export async function createElectricityEntry(input: ElectricityInput) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return { success: false, error: "Sesi tidak valid. Silakan login kembali." };
    }

    // Get active business
    const business = await db.business.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    if (!business) {
      return { success: false, error: "Data usaha tidak ditemukan. Selesaikan profil usaha terlebih dahulu." };
    }

    // Upsert electricity entry (update if year-month exists, create otherwise)
    const entry = await db.electricityEntry.upsert({
      where: {
        businessId_year_month: {
          businessId: business.id,
          year: input.year,
          month: input.month,
        },
      },
      update: {
        usageKwh: input.usageKwh,
        costIdr: input.costIdr,
      },
      create: {
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
    console.error("Electricity Entry Error:", error);
    return { success: false, error: error.message || "Gagal menyimpan data listrik." };
  }
}