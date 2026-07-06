"use server";

import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function activateProTrialAction() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "Sesi tidak valid. Silakan login kembali." };
  }
  const userId = session.user.id;

  try {
    // Check if user already has an active trial
    const activeSub = await db.subscription.findFirst({
      where: {
        userId,
        status: { in: ["ACTIVE", "TRIAL_ACTIVE"] },
      },
      include: { plan: true },
    });

    if (activeSub && (activeSub.plan.code === "PRO_TRIAL" || activeSub.status === "TRIAL_ACTIVE")) {
      return { success: false, error: "Masa Pro Trial Anda saat ini sedang aktif." };
    }

    // Get the PRO_TRIAL plan
    const trialPlan = await db.plan.findUnique({
      where: { code: "PRO_TRIAL" },
    });

    if (!trialPlan) {
      return { success: false, error: "Paket Pro Trial tidak ditemukan di sistem." };
    }

    await db.$transaction(async (tx) => {
      // 1. Expire existing active subscriptions
      if (activeSub) {
        await tx.subscription.update({
          where: { id: activeSub.id },
          data: {
            status: "EXPIRED",
            endsAt: new Date(),
          },
        });
      }

      // 2. Create the new trialing subscription
      const startsAt = new Date();
      const endsAt = new Date(startsAt.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
      await tx.subscription.create({
        data: {
          userId,
          planId: trialPlan.id,
          status: "TRIAL_ACTIVE",
          startsAt,
          endsAt,
          trialStartDate: startsAt,
          trialEndDate: endsAt,
        },
      });
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/prediksi");
    revalidatePath("/dashboard/rekomendasi");
    revalidatePath("/dashboard/anomali");
    revalidatePath("/dashboard/laporan");
    revalidatePath("/dashboard/harga-paket");
    revalidatePath("/dashboard/paket-demo");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: "Gagal mengaktifkan Pro Trial: " + error.message };
  }
}
