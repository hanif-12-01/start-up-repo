"use server";

import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { BusinessType, UsageStatus } from "@prisma/client";
import { getActiveBusinessId, setActiveBusiness as setActiveBusinessCookie } from "@/services/business";

export interface OnboardingInput {
  name: string;
  type: BusinessType;
  address: string;
  powerVA: number;
  operatingHours: string;
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

    const business = await db.business.create({
      data: {
        name: input.name,
        type: input.type,
        address: input.address,
        powerVA: input.powerVA,
        operatingHours: input.operatingHours,
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
      },
    });

    // Set as active business immediately so dashboard has scope on first load.
    await setActiveBusinessCookie(session.user.id, business.id);

    revalidatePath("/dashboard");
    revalidatePath("/onboarding");

    return { success: true, businessId: business.id };
  } catch (error: any) {
    console.error("Onboarding Error:", error);
    return { success: false, error: error.message || "Gagal menyimpan data usaha." };
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
    console.error("Get Business Profile Error:", error);
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
    console.error("Update Business Profile Error:", error);
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
    revalidatePath("/dashboard/laporan");
    revalidatePath("/dashboard/profil");

    return { success: true };
  } catch (error: any) {
    console.error("Switch Business Error:", error);
    return { success: false, error: error.message || "Gagal mengganti usaha." };
  }
}
