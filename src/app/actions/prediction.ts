"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { generatePrediction } from "@/services/prediction";

export async function getOrGeneratePredictionAction(businessId: string, month?: number, year?: number) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { success: false, error: "Sesi tidak valid. Silakan login kembali." };
  }

  if (typeof businessId !== "string" || businessId.trim() === "") {
    return { success: false, error: "Bisnis tidak valid." };
  }

  if (month !== undefined && (!Number.isInteger(month) || month < 1 || month > 12)) {
    return { success: false, error: "Bulan tidak valid." };
  }

  if (year !== undefined && (!Number.isInteger(year) || year < 2000 || year > 2100)) {
    return { success: false, error: "Tahun tidak valid." };
  }

  // Verify that business belongs to the user
  const business = await db.business.findFirst({
    where: {
      id: businessId,
      userId: session.user.id,
    },
  });

  if (!business) {
    return { success: false, error: "Bisnis tidak ditemukan atau bukan milik Anda." };
  }

  let targetMonth = month;
  let targetYear = year;

  // If month or year is not specified, find the latest electricity entry
  if (targetMonth === undefined || targetYear === undefined) {
    const latestEntry = await db.electricityEntry.findFirst({
      where: { businessId },
      orderBy: [
        { year: "desc" },
        { month: "desc" },
      ],
    });

    if (!latestEntry) {
      return {
        success: false,
        error: "Belum ada data pemakaian listrik untuk bisnis ini. Silakan isi data pemakaian terlebih dahulu.",
      };
    }

    targetMonth = latestEntry.month;
    targetYear = latestEntry.year;
  }

  try {
    const prediction = await generatePrediction({
      businessId,
      month: targetMonth,
      year: targetYear,
      userId: session.user.id,
    });

    if (!prediction) {
      return {
        success: false,
        error: "Gagal membuat prediksi. Data pemakaian listrik pada bulan terkait tidak ditemukan.",
      };
    }

    revalidatePath("/dashboard/prediksi");

    // Sengaja tidak mengembalikan record Prisma mentah (id/businessId/timestamp internal).
    // Client hanya butuh sinyal sukses; data prediksi terbaru dimuat ulang lewat revalidatePath.
    return { success: true };
  } catch (error: any) {
    console.error("Prediction Action Error:", error);
    return {
      success: false,
      error: "Terjadi kesalahan sistem saat memproses prediksi. Silakan coba beberapa saat lagi.",
    };
  }
}
