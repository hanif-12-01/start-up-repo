"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";

export async function toggleRecommendationAction(id: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { success: false, error: "Sesi tidak valid. Silakan login kembali." };
  }

  const recommendation = await db.recommendation.findFirst({
    where: {
      id,
      business: {
        userId: session.user.id,
      },
    },
    select: {
      id: true,
      title: true,
      isImplemented: true,
    },
  });

  if (!recommendation) {
    return { success: false, error: "Rekomendasi tidak ditemukan." };
  }

  const updated = await db.recommendation.update({
    where: { id },
    data: { isImplemented: !recommendation.isImplemented },
    select: {
      title: true,
      isImplemented: true,
    },
  });

  revalidatePath("/dashboard/rekomendasi");

  return {
    success: true,
    title: updated.title,
    isImplemented: updated.isImplemented,
  };
}