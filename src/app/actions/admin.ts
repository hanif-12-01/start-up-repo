"use server";

import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// Helper to check if current user is admin or demo account
async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  const email = session.user.email?.toLowerCase();
  const role = (session.user as any).role;

  // Allow either role ADMIN or the demo owner email
  if (role !== "ADMIN" && email !== "owner@wattwise.id") {
    throw new Error("Forbidden: Hanya untuk akun Administrator / Demo Owner.");
  }
  return session.user;
}

export async function getAdminDataAction() {
  await requireAdmin();

  try {
    const users = await db.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        crmStage: true,
        crmNotes: true,
        createdAt: true,
      },
    });

    const businesses = await db.business.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { name: true, email: true },
        },
        appliances: {
          select: { id: true },
        },
      },
    });

    const rawPayments = await db.payment.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        plan: true,
      },
    });

    const paymentUserIds = Array.from(new Set(rawPayments.map((p) => p.userId)));
    const paymentUsers = await db.user.findMany({
      where: { id: { in: paymentUserIds } },
      select: { id: true, name: true, email: true },
    });

    const payments = rawPayments.map((p) => {
      const u = paymentUsers.find((usr) => usr.id === p.userId);
      return {
        ...p,
        user: {
          name: u?.name || "Owner",
          email: u?.email || "Unknown",
        },
      };
    });

    const subscriptions = await db.subscription.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        plan: true,
      },
    });

    const plans = await db.plan.findMany({
      where: { isActive: true },
    });

    return {
      ok: true as const,
      users,
      businesses,
      payments,
      subscriptions,
      plans,
    };
  } catch (error: any) {
    return {
      ok: false as const,
      error: error.message || "Gagal mengambil data admin.",
    };
  }
}

export async function updateUserPlanAction(userId: string, planCode: string) {
  await requireAdmin();

  try {
    const targetPlan = await db.plan.findUnique({
      where: { code: planCode },
    });

    if (!targetPlan) {
      return { ok: false as const, error: "Paket tidak ditemukan." };
    }

    await db.$transaction(async (tx) => {
      // 1. Expire existing subscriptions
      await tx.subscription.updateMany({
        where: {
          userId,
          status: "ACTIVE",
        },
        data: {
          status: "EXPIRED",
          endsAt: new Date(),
        },
      });

      // 2. Create new active subscription
      await tx.subscription.create({
        data: {
          userId,
          planId: targetPlan.id,
          status: "ACTIVE",
          startsAt: new Date(),
          endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          trialStartDate: planCode === "PRO_UMKM" ? new Date() : null,
          trialEndDate: planCode === "PRO_UMKM" ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
        },
      });
    });

    revalidatePath("/admin/dashboard");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/billing");
    revalidatePath("/dashboard/harga-paket");

    return { ok: true as const };
  } catch (error: any) {
    return {
      ok: false as const,
      error: error.message || "Gagal mengubah paket pengguna.",
    };
  }
}

export async function updatePaymentStatusAction(paymentId: string, status: string) {
  await requireAdmin();

  try {
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      return { ok: false as const, error: "Invoice tidak ditemukan." };
    }

    if (status === "SUCCESS") {
      const plan = await db.plan.findUnique({
        where: { id: payment.planId },
      });

      if (!plan) {
        return { ok: false as const, error: "Paket tidak ditemukan." };
      }

      await db.$transaction(async (tx) => {
        // 1. Update payment status
        await tx.payment.update({
          where: { id: paymentId },
          data: { status: "SUCCESS", paidAt: new Date() },
        });

        // 2. Expire old subscriptions
        await tx.subscription.updateMany({
          where: {
            userId: payment.userId,
            status: "ACTIVE",
          },
          data: {
            status: "EXPIRED",
            endsAt: new Date(),
          },
        });

        // 3. Create new active subscription
        await tx.subscription.create({
          data: {
            userId: payment.userId,
            planId: plan.id,
            status: "ACTIVE",
            startsAt: new Date(),
            endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            trialStartDate: null,
            trialEndDate: null,
          },
        });
      });
    } else {
      await db.payment.update({
        where: { id: paymentId },
        data: { status },
      });
    }

    revalidatePath("/admin/dashboard");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/billing");

    return { ok: true as const };
  } catch (error: any) {
    return {
      ok: false as const,
      error: error.message || "Gagal mengubah status pembayaran.",
    };
  }
}

export async function updateUserCrmAction(
  userId: string,
  crmStage: string,
  crmNotes: string
) {
  await requireAdmin();

  try {
    await db.user.update({
      where: { id: userId },
      data: {
        crmStage,
        crmNotes,
      },
    });

    revalidatePath("/admin/dashboard");
    return { ok: true as const };
  } catch (error: any) {
    return {
      ok: false as const,
      error: error.message || "Gagal memperbarui catatan CRM.",
    };
  }
}
