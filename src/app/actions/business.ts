"use server";

import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { BusinessType, UsageStatus } from "@prisma/client";

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

    revalidatePath("/dashboard");
    revalidatePath("/onboarding");
    
    return { success: true, businessId: business.id };
  } catch (error: any) {
    console.error("Onboarding Error:", error);
    return { success: false, error: error.message || "Gagal menyimpan data usaha." };
  }
}