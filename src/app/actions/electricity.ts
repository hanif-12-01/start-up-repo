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

    // Generate mock analysis result
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
        avgDailyKwh: input.usageKwh / 30,
        carbonKg: input.usageKwh * 0.85, // roughly 0.85 kg CO2 per kWh
        efficiencyScore: Math.floor(Math.random() * 40) + 50, // 50-90 score
      },
      create: {
        businessId: business.id,
        month: input.month,
        year: input.year,
        totalUsageKwh: input.usageKwh,
        totalCostIdr: input.costIdr,
        avgDailyKwh: input.usageKwh / 30,
        carbonKg: input.usageKwh * 0.85,
        efficiencyScore: Math.floor(Math.random() * 40) + 50,
      },
    });

    // If usage is abnormally high (e.g. > 1000 kWh), trigger an anomaly
    if (input.usageKwh > 1000) {
      await db.anomaly.create({
        data: {
          businessId: business.id,
          month: input.month,
          year: input.year,
          description: `Konsumsi listrik melebihi batas wajar bulanan (${input.usageKwh.toFixed(1)} kWh). Terdeteksi lonjakan pemakaian pada jam operasional.`,
          severity: RiskLevel.HIGH,
          usageKwh: input.usageKwh,
          expectedKwh: 800,
          isResolved: false,
        },
      });
    }

    // Generate savings recommendations
    const savings = Math.round(input.costIdr * 0.15); // mock 15% savings
    await db.recommendation.create({
      data: {
        businessId: business.id,
        title: "Optimalkan Penggunaan Penyejuk Ruangan (AC) / Kulkas",
        description: "Gunakan timer otomatis untuk mematikan AC 30 menit sebelum jam tutup dan pastikan suhu AC diatur pada 24-25°C untuk efisiensi kompresor optimal.",
        estimatedSavingsIdr: savings,
        difficulty: RecommendationDifficulty.EASY,
        isImplemented: false,
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