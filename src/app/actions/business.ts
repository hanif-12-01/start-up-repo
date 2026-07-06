"use server";

import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { BusinessType, UsageStatus } from "@prisma/client";
import { getActiveBusinessId, setActiveBusiness as setActiveBusinessCookie } from "@/services/business";
import { safeError } from "@/lib/safe-log";
import { getUserPlan } from "@/services/subscription";

export interface OnboardingInput {
  name: string;
  type: BusinessType;
  address: string;
  powerVA: number;
  operatingHours: string;
  mode: string;
  revenueRange?: string;
  operatingDays?: number;
  appliances: {
    name: string;
    powerWatt: number;
    quantity: number;
    dailyUsageHours: number;
  }[];
}

export async function createOnboardingBusiness(input: OnboardingInput) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return { success: false, error: "Sesi tidak valid. Silakan login kembali." };
    }

    const { plan } = await getUserPlan(session.user.id);
    const planCode = plan?.code || "FREE";
    const existingCount = await db.business.count({
      where: { userId: session.user.id },
    });

    if (planCode === "FREE" && existingCount >= 1) {
      return { success: false, error: "Paket Gratis hanya mendukung maksimal 1 usaha. Silakan upgrade ke paket premium." };
    }
    if ((planCode === "PRO_UMKM" || planCode === "PRO_TRIAL" || planCode === "PRO") && existingCount >= 3) {
      return { success: false, error: "Paket Pro hanya mendukung maksimal 3 usaha. Silakan upgrade ke paket Bisnis." };
    }
    if (planCode === "BUSINESS" && existingCount >= 50) {
      return { success: false, error: "Paket Bisnis mendukung maksimal 50 usaha. Hubungi tim WattWise untuk kebutuhan Enterprise khusus." };
    }

    const business = await db.business.create({
      data: {
        name: input.name,
        type: input.type,
        address: input.address,
        powerVA: input.powerVA,
        operatingHours: input.operatingHours,
        mode: input.mode,
        revenueRange: input.revenueRange,
        operatingDays: input.operatingDays ?? 30,
        userId: session.user.id,
        appliances: {
          create: input.appliances.map((app) => ({
            name: app.name,
            powerWatt: app.powerWatt,
            quantity: app.quantity,
            dailyUsageHours: app.dailyUsageHours,
            usageStatus: UsageStatus.ACTIVE,
          })),
        },
        memberships: {
          create: {
            userId: session.user.id,
            role: "BUSINESS_OWNER",
            status: "ACTIVE",
          }
        }
      },
    });

    // Set as active business immediately so dashboard has scope on first load.
    await setActiveBusinessCookie(session.user.id, business.id);

    revalidatePath("/dashboard");
    revalidatePath("/onboarding");

    return { success: true, businessId: business.id };
  } catch (error: any) {
    safeError("onboarding", error);
    return { success: false, error: error.message || "Gagal menyimpan data usaha." };
  }
}

export async function createBusinessAction(input: {
  name: string;
  type: BusinessType;
  address: string;
  powerVA: number;
  operatingHours: string;
}) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return { success: false, error: "Sesi tidak valid. Silakan login kembali." };
    }

    const { plan } = await getUserPlan(session.user.id);
    const planCode = plan?.code || "FREE";
    const existingCount = await db.business.count({
      where: { userId: session.user.id },
    });

    if (planCode === "FREE" && existingCount >= 1) {
      return { success: false, error: "Paket Gratis hanya mendukung maksimal 1 usaha. Silakan upgrade ke paket premium untuk menambahkan usaha baru." };
    }
    if ((planCode === "PRO_UMKM" || planCode === "PRO_TRIAL" || planCode === "PRO") && existingCount >= 3) {
      return { success: false, error: "Paket Pro mendukung maksimal 3 bisnis/properti. Upgrade ke Paket Bisnis untuk dashboard agregat dan kebutuhan multi-cabang." };
    }
    if (planCode === "BUSINESS" && existingCount >= 50) {
      return { success: false, error: "Paket Bisnis mendukung maksimal 50 bisnis/properti. Hubungi tim WattWise untuk kebutuhan enterprise khusus." };
    }
    if (planCode === "ENTERPRISE") {
      // Enterprise has custom limits, allow more than 50 logically for demo/simulation.
      // Limit check bypassed.
    }

    const business = await db.business.create({
      data: {
        name: input.name,
        type: input.type,
        address: input.address,
        powerVA: input.powerVA,
        operatingHours: input.operatingHours,
        userId: session.user.id,
        memberships: {
          create: {
            userId: session.user.id,
            role: "BUSINESS_OWNER",
            status: "ACTIVE",
          }
        }
      },
    });

    await setActiveBusinessCookie(session.user.id, business.id);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/profil");

    return { success: true, businessId: business.id };
  } catch (error: any) {
    safeError("createBusinessAction", error);
    return { success: false, error: error.message || "Gagal menambahkan usaha baru." };
  }
}

export async function getBusinessProfile() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "Sesi tidak valid. Silakan login kembali." };
    }

    const activeId = await getActiveBusinessId(session.user.id);
    if (!activeId) {
      return { success: false, error: "Profil usaha tidak ditemukan." };
    }

    const business = await db.business.findFirst({
      where: { id: activeId, userId: session.user.id },
      include: {
        appliances: {
          orderBy: { powerWatt: "desc" },
        },
      },
    });

    if (!business) {
      return { success: false, error: "Profil usaha tidak ditemukan." };
    }

    return { success: true, business: JSON.parse(JSON.stringify(business)) };
  } catch (error: any) {
    safeError("getBusinessProfile", error);
    return { success: false, error: error.message || "Gagal mengambil data usaha." };
  }
}

export async function updateBusinessProfile(input: {
  name: string;
  type: BusinessType;
  address: string;
  powerVA: number;
  operatingHours: string;
  peralatanListrik: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "Sesi tidak valid. Silakan login kembali." };
    }

    const activeId = await getActiveBusinessId(session.user.id);
    if (!activeId) {
      return { success: false, error: "Usaha tidak ditemukan." };
    }

    const business = await db.business.findFirst({
      where: { id: activeId, userId: session.user.id },
      include: {
        appliances: true,
      },
    });

    if (!business) {
      return { success: false, error: "Usaha tidak ditemukan." };
    }

    const newApplianceNames = input.peralatanListrik
      .split(",")
      .map((name) => name.trim())
      .filter((name) => name.length > 0);

    const existingAppliances = business.appliances;

    const toDelete = existingAppliances.filter(
      (app) => !newApplianceNames.some((n) => n.toLowerCase() === app.name.toLowerCase())
    );

    const toCreateNames = newApplianceNames.filter(
      (name) => !existingAppliances.some((app) => app.name.toLowerCase() === name.toLowerCase())
    );

    await db.$transaction(async (tx) => {
      await tx.business.update({
        where: { id: business.id },
        data: {
          name: input.name,
          type: input.type,
          address: input.address,
          powerVA: input.powerVA,
          operatingHours: input.operatingHours,
        },
      });

      if (toDelete.length > 0) {
        await tx.appliance.deleteMany({
          where: {
            id: { in: toDelete.map((app) => app.id) },
          },
        });
      }

      for (const name of toCreateNames) {
        await tx.appliance.create({
          data: {
            name,
            powerWatt: 150,
            quantity: 1,
            dailyUsageHours: 6,
            businessId: business.id,
            usageStatus: UsageStatus.ACTIVE,
          },
        });
      }
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/profil");

    return { success: true };
  } catch (error: any) {
    safeError("updateBusinessProfile", error);
    return { success: false, error: error.message || "Gagal memperbarui data usaha." };
  }
}

export async function switchActiveBusinessAction(businessId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "Sesi tidak valid. Silakan login kembali." };
    }

    await setActiveBusinessCookie(session.user.id, businessId);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/input");
    revalidatePath("/dashboard/prediksi");
    revalidatePath("/dashboard/anomali");
    revalidatePath("/dashboard/rekomendasi");
    revalidatePath("/dashboard/peralatan");
    revalidatePath("/dashboard/notifikasi");
    revalidatePath("/dashboard/laporan");
    revalidatePath("/dashboard/profil");

    return { success: true };
  } catch (error: any) {
    safeError("switchBusiness", error);
    return { success: false, error: error.message || "Gagal mengganti usaha." };
  }
}

export async function checkBusinessLimitAction() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { reached: true, error: "Sesi tidak valid." };

    const { plan } = await getUserPlan(session.user.id);
    const planCode = plan?.code || "FREE";
    const count = await db.business.count({
      where: { userId: session.user.id },
    });

    if (planCode === "FREE" && count >= 1) {
      return { reached: true, planCode, count, error: "Akun Paket Gratis Anda telah mencapai batas maksimal 1 usaha." };
    }
    if ((planCode === "PRO_UMKM" || planCode === "PRO_TRIAL" || planCode === "PRO") && count >= 3) {
      return { reached: true, planCode, count, error: "Akun Paket Pro Anda telah mencapai batas maksimal 3 usaha." };
    }
    if (planCode === "BUSINESS" && count >= 50) {
      return { reached: true, planCode, count, error: "Akun Paket Bisnis Anda telah mencapai batas maksimal 50 usaha." };
    }
    return { reached: false, planCode, count };
  } catch (error: any) {
    return { reached: true, error: error.message };
  }
}
