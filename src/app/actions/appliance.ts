"use server";

import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { safeError } from "@/lib/safe-log";
import { getActiveBusinessId } from "@/services/business";
import { UsageStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const applianceSchema = z.object({
  name: z.string().trim().min(2, "Nama alat minimal 2 karakter."),
  powerWatt: z.coerce.number().min(1, "Daya minimal 1 watt."),
  quantity: z.coerce.number().int().min(1, "Jumlah minimal 1."),
  dailyUsageHours: z.coerce.number().gt(0, "Jam pakai harus lebih dari 0.").max(24, "Jam pakai maksimal 24 jam."),
  usageStatus: z.enum([UsageStatus.ACTIVE, UsageStatus.INACTIVE, UsageStatus.MAINTENANCE]),
});

export type ApplianceInput = z.input<typeof applianceSchema>;

async function getScope() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Sesi tidak valid. Silakan login kembali.");

  const businessId = await getActiveBusinessId(session.user.id);
  if (!businessId) throw new Error("Usaha aktif tidak ditemukan.");

  return { userId: session.user.id, businessId };
}

function revalidateApplianceViews() {
  revalidatePath("/dashboard/peralatan");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/rekomendasi");
  revalidatePath("/dashboard/laporan");
}

export async function createApplianceAction(input: ApplianceInput) {
  try {
    const data = applianceSchema.parse(input);
    const { businessId } = await getScope();

    await db.appliance.create({ data: { ...data, businessId } });
    revalidateApplianceViews();
    return { success: true };
  } catch (error: any) {
    safeError("createAppliance", error);
    return { success: false, error: error.message || "Gagal menambah peralatan." };
  }
}

export async function updateApplianceAction(id: string, input: ApplianceInput) {
  try {
    const data = applianceSchema.parse(input);
    const { businessId } = await getScope();

    const res = await db.appliance.updateMany({ where: { id, businessId }, data });
    if (res.count === 0) throw new Error("Peralatan tidak ditemukan.");

    revalidateApplianceViews();
    return { success: true };
  } catch (error: any) {
    safeError("updateAppliance", error);
    return { success: false, error: error.message || "Gagal memperbarui peralatan." };
  }
}

export async function deleteApplianceAction(id: string) {
  try {
    const { businessId } = await getScope();
    const res = await db.appliance.deleteMany({ where: { id, businessId } });
    if (res.count === 0) throw new Error("Peralatan tidak ditemukan.");

    revalidateApplianceViews();
    return { success: true };
  } catch (error: any) {
    safeError("deleteAppliance", error);
    return { success: false, error: error.message || "Gagal menghapus peralatan." };
  }
}