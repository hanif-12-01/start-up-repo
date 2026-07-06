import { db } from "@/lib/db";
import { UsageStatus } from "@prisma/client";

/**
 * Validates that the user owns the business.
 * Throws an error if ownership is invalid.
 */
async function validateBusinessOwnership(userId: string, businessId: string) {
  const business = await db.business.findFirst({
    where: { id: businessId, userId },
  });
  if (!business) {
    throw new Error("Usaha tidak ditemukan atau Anda tidak memiliki akses.");
  }
  return business;
}

/**
 * Validates that an appliance belongs to a business owned by the user.
 */
async function validateApplianceOwnership(userId: string, applianceId: string) {
  const appliance = await db.appliance.findFirst({
    where: {
      id: applianceId,
      business: { userId },
    },
  });
  if (!appliance) {
    throw new Error("Alat listrik tidak ditemukan atau Anda tidak memiliki akses.");
  }
  return appliance;
}

/**
 * Fetch all appliances for a business.
 */
export async function getAppliancesForBusiness(userId: string, businessId: string) {
  await validateBusinessOwnership(userId, businessId);

  return db.appliance.findMany({
    where: { businessId, usageStatus: UsageStatus.ACTIVE },
    orderBy: { powerWatt: "desc" },
  });
}

/**
 * Create a new appliance for a business.
 */
export async function createAppliance(
  userId: string,
  businessId: string,
  input: {
    name: string;
    category?: string | null;
    powerWatt: number;
    quantity: number;
    dailyUsageHours: number;
    applianceCode?: string | null;
  }
) {
  await validateBusinessOwnership(userId, businessId);

  return db.appliance.create({
    data: {
      businessId,
      name: input.name,
      category: input.category || "Lainnya",
      powerWatt: input.powerWatt,
      quantity: input.quantity,
      dailyUsageHours: input.dailyUsageHours,
      applianceCode: input.applianceCode || null,
      source: "MANUAL",
      usageStatus: UsageStatus.ACTIVE,
    },
  });
}

/**
 * Update an existing appliance.
 */
export async function updateAppliance(
  userId: string,
  applianceId: string,
  input: {
    name?: string;
    category?: string | null;
    powerWatt?: number;
    quantity?: number;
    dailyUsageHours?: number;
    usageStatus?: UsageStatus;
    applianceCode?: string | null;
  }
) {
  const appliance = await validateApplianceOwnership(userId, applianceId);

  return db.appliance.update({
    where: { id: applianceId },
    data: {
      name: input.name !== undefined ? input.name : undefined,
      category: input.category !== undefined ? input.category : undefined,
      powerWatt: input.powerWatt !== undefined ? input.powerWatt : undefined,
      quantity: input.quantity !== undefined ? input.quantity : undefined,
      dailyUsageHours: input.dailyUsageHours !== undefined ? input.dailyUsageHours : undefined,
      usageStatus: input.usageStatus !== undefined ? input.usageStatus : undefined,
      applianceCode: input.applianceCode !== undefined ? input.applianceCode : undefined,
    },
  });
}

/**
 * Delete an appliance.
 */
export async function deleteAppliance(userId: string, applianceId: string) {
  await validateApplianceOwnership(userId, applianceId);

  // Soft delete by setting usageStatus to INACTIVE
  return db.appliance.update({
    where: { id: applianceId },
    data: {
      usageStatus: UsageStatus.INACTIVE,
    },
  });
}

/**
 * Generate a summary of electricity usage estimates for all appliances in a business.
 */
export async function getApplianceSummaryForBusiness(userId: string, businessId: string) {
  await validateBusinessOwnership(userId, businessId);

  const appliances = await db.appliance.findMany({
    where: { businessId, usageStatus: UsageStatus.ACTIVE },
  });

  const latestEntry = await db.electricityEntry.findFirst({
    where: { businessId },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  let averageTariffIdrPerKwh = 1450; // default PLN tariff fallback
  let latestActualKwh = null;
  if (latestEntry && latestEntry.usageKwh > 0) {
    averageTariffIdrPerKwh = latestEntry.costIdr / latestEntry.usageKwh;
    latestActualKwh = latestEntry.usageKwh;
  }

  // Calculate stats for each appliance using a 30-day assumption
  const calculatedAppliances = appliances.map((app) => {
    const monthlyKwh = (app.powerWatt * app.quantity * app.dailyUsageHours * 30) / 1000;
    const monthlyCost = monthlyKwh * averageTariffIdrPerKwh;
    return {
      ...app,
      monthlyKwh,
      monthlyCost,
    };
  });

  const totalEstimatedKwh = calculatedAppliances.reduce((sum, a) => sum + a.monthlyKwh, 0);
  const totalEstimatedCost = calculatedAppliances.reduce((sum, a) => sum + a.monthlyCost, 0);

  // Order by monthly kWh descending
  const sorted = [...calculatedAppliances].sort((a, b) => b.monthlyKwh - a.monthlyKwh);
  const topAppliancesByKwh = sorted.slice(0, 3);
  const highestAppliance = sorted.length > 0 ? sorted[0] : null;

  const coverageRatio = latestActualKwh && latestActualKwh > 0 ? totalEstimatedKwh / latestActualKwh : null;

  return {
    totalEstimatedKwh,
    totalEstimatedCost,
    topAppliancesByKwh,
    applianceCount: appliances.length,
    highestAppliance,
    coverageRatio,
    averageTariffIdrPerKwh,
  };
}
