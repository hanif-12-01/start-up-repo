"use server";

import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function checkoutPlanAction(planCode: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { ok: false as const, error: "Unauthorized" };
  }
  const userId = (session.user as any).id;

  const plan = await db.plan.findUnique({
    where: { code: planCode },
  });

  if (!plan) {
    return { ok: false as const, error: "Paket tidak ditemukan." };
  }

  // Create payment invoice
  const invoiceNo = `INV-${Date.now()}`;
  const vaNumber = `88012${Math.floor(1000000000 + Math.random() * 9000000000)}`;

  try {
    const payment = await db.payment.create({
      data: {
        invoiceNo,
        amountIdr: plan.priceIdr,
        status: "PENDING",
        method: "VIRTUAL_ACCOUNT",
        virtualAccount: vaNumber,
        userId,
        planCode,
        plan: {
          connect: { id: plan.id },
        },
      },
    });

    return {
      ok: true as const,
      paymentId: payment.id,
    };
  } catch (error: any) {
    return {
      ok: false as const,
      error: "Gagal membuat invoice: " + error.message,
    };
  }
}

export async function simulatePaymentSuccessAction(paymentId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { ok: false as const, error: "Unauthorized" };
  }
  const userId = (session.user as any).id;

  try {
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      return { ok: false as const, error: "Invoice tidak ditemukan." };
    }

    if (payment.userId !== userId) {
      return { ok: false as const, error: "Unauthorized" };
    }

    if (payment.status !== "PENDING") {
      return { ok: false as const, error: "Status invoice tidak valid untuk pembayaran." };
    }

    const plan = await db.plan.findUnique({
      where: { code: payment.planCode },
    });

    if (!plan) {
      return { ok: false as const, error: "Paket tidak ditemukan." };
    }

    // Use transaction to ensure subscription is updated & payment is marked successful together
    await db.$transaction(async (tx) => {
      // 1. Update payment status to SUCCESS
      await tx.payment.update({
        where: { id: paymentId },
        data: { status: "SUCCESS" },
      });

      // 2. Set previous active subscriptions to EXPIRED
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

      // 3. Create new ACTIVE subscription
      const startsAt = new Date();
      const endsAt = new Date(startsAt.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
      await tx.subscription.create({
        data: {
          userId,
          planId: plan.id,
          status: "ACTIVE",
          startsAt,
          endsAt,
        },
      });
    });

    revalidatePath("/dashboard/billing");
    return { ok: true as const };
  } catch (error: any) {
    return {
      ok: false as const,
      error: "Gagal memproses pembayaran simulasi: " + error.message,
    };
  }
}

export async function cancelPaymentAction(paymentId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { ok: false as const, error: "Unauthorized" };
  }
  const userId = (session.user as any).id;

  try {
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      return { ok: false as const, error: "Invoice tidak ditemukan." };
    }

    if (payment.userId !== userId) {
      return { ok: false as const, error: "Unauthorized" };
    }

    if (payment.status !== "PENDING") {
      return { ok: false as const, error: "Status invoice tidak valid untuk dibatalkan." };
    }

    await db.payment.update({
      where: { id: paymentId },
      data: { status: "FAILED" },
    });

    revalidatePath("/dashboard/billing");
    return { ok: true as const };
  } catch (error: any) {
    return {
      ok: false as const,
      error: "Gagal membatalkan invoice: " + error.message,
    };
  }
}

export async function cancelSubscriptionAction() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { ok: false, error: "Unauthorized" };
  }
  const userId = (session.user as any).id;

  try {
    // Find active subscription
    const activeSub = await db.subscription.findFirst({
      where: {
        userId,
        status: "ACTIVE",
      },
    });

    if (!activeSub) {
      return { ok: false, error: "Tidak ada langganan aktif." };
    }

    // Check if it's already FREE
    const freePlan = await db.plan.findUnique({
      where: { code: "FREE" },
    });

    if (freePlan && activeSub.planId === freePlan.id) {
      return { ok: false, error: "Paket Gratis tidak dapat dibatalkan." };
    }

    await db.$transaction(async (tx) => {
      // 1. Expire existing subscription
      await tx.subscription.update({
        where: { id: activeSub.id },
        data: {
          status: "CANCELLED",
          endsAt: new Date(),
        },
      });

      // 2. Auto-create FREE subscription
      if (freePlan) {
        await tx.subscription.create({
          data: {
            userId,
            planId: freePlan.id,
            status: "ACTIVE",
            startsAt: new Date(),
            endsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          },
        });
      }
    });

    revalidatePath("/dashboard/billing");
    revalidatePath("/dashboard/harga-paket");
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: "Gagal membatalkan langganan: " + error.message };
  }
}

export async function changeSubscriptionPlanAction(planCode: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { ok: false, error: "Unauthorized" };
  }
  const userId = (session.user as any).id;

  try {
    // Find the target plan
    const targetPlan = await db.plan.findUnique({
      where: { code: planCode },
    });

    if (!targetPlan) {
      return { ok: false, error: "Paket target tidak ditemukan." };
    }

    // Find active subscription
    const activeSub = await db.subscription.findFirst({
      where: {
        userId,
        status: "ACTIVE",
      },
      include: {
        plan: true,
      },
    });

    if (activeSub && activeSub.plan.code === planCode) {
      return { ok: false, error: "Anda sudah menggunakan paket ini." };
    }

    // If target is FREE, just cancel / downgrade to FREE immediately
    if (planCode === "FREE") {
      return await cancelSubscriptionAction();
    }

    // Upgrade/Downgrade path:
    // If it's a paid plan, we can simulate an immediate swap (or checkout/upgrade flow)
    // Since the prompt states "paket bisa di upgrade atau downgrade" and the pricing page normally goes to a payment invoice checkout flow,
    // let's allow an immediate plan change action (direct swap/change) OR generate a new success subscription.
    // To support seamless upgrade/downgrade, let's implement immediate transition and set status to ACTIVE.
    await db.$transaction(async (tx) => {
      if (activeSub) {
        await tx.subscription.update({
          where: { id: activeSub.id },
          data: {
            status: "EXPIRED",
            endsAt: new Date(),
          },
        });
      }

      await tx.subscription.create({
        data: {
          userId,
          planId: targetPlan.id,
          status: "ACTIVE",
          startsAt: new Date(),
          endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      });
    });

    revalidatePath("/dashboard/billing");
    revalidatePath("/dashboard/harga-paket");
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: "Gagal mengganti paket: " + error.message };
  }
}
