import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { cache } from "react";

// Cookie name mandated by guidebook §11.1
export const ACTIVE_BUSINESS_COOKIE = "wattwise_active_business_id";

export const getUserBusinesses = cache(async (userId: string) => {
  return db.business.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
});

/**
 * Read active businessId cookie, validate ownership.
 * Fallback to first business owned by user.
 * Returns null if user has no business (caller must redirect to /onboarding).
 */
export const getActiveBusinessId = cache(async (userId: string): Promise<string | null> => {
  const cookieStore = cookies();
  const cookieValue = cookieStore.get(ACTIVE_BUSINESS_COOKIE)?.value;

  if (cookieValue) {
    const exists = await db.business.findFirst({
      where: { id: cookieValue, userId },
      select: { id: true },
    });
    if (exists) return exists.id;
  }

  const firstBusiness = await db.business.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  return firstBusiness?.id ?? null;
});

export const getActiveBusiness = cache(async (userId: string) => {
  const businessId = await getActiveBusinessId(userId);
  if (!businessId) return null;
  return db.business.findUnique({ where: { id: businessId } });
});

/** Guidebook-preferred helper name (§11.2). */
export const getActiveBusinessForUser = cache(async (userId: string) => {
  return getActiveBusiness(userId);
});

export async function setActiveBusiness(userId: string, businessId: string) {
  const business = await db.business.findFirst({
    where: { id: businessId, userId },
    select: { id: true },
  });

  if (!business) {
    throw new Error("Usaha tidak ditemukan atau Anda tidak memiliki akses.");
  }

  cookies().set(ACTIVE_BUSINESS_COOKIE, business.id, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  return business.id;
}

export async function requireActiveBusiness(userId: string) {
  return getActiveBusiness(userId);
}

/**
 * Fetches the active business with all relation models required by the main dashboard.
 * Wrapped in React cache to avoid duplicate queries across layout and page.
 */
export const getDashboardDataForBusiness = cache(async (userId: string) => {
  const activeBusinessId = await getActiveBusinessId(userId);
  if (!activeBusinessId) return null;

  return db.business.findFirst({
    where: { id: activeBusinessId, userId },
    select: {
      name: true,
      electricityEntries: {
        orderBy: [{ year: "desc" }, { month: "desc" }],
        take: 6,
        select: { month: true, year: true, usageKwh: true, costIdr: true },
      },
      dailyUsages: {
        orderBy: { date: "asc" },
        take: 14,
        select: { date: true, usageKwh: true },
      },
      appliances: {
        where: { usageStatus: "ACTIVE" },
        orderBy: { powerWatt: "desc" },
        select: { name: true, powerWatt: true, quantity: true, dailyUsageHours: true },
      },
      analysisResults: {
        orderBy: [{ year: "desc" }, { month: "desc" }],
        take: 1,
        select: { avgDailyKwh: true, efficiencyScore: true },
      },
      anomalies: {
        where: { isResolved: false },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { description: true },
      },
      recommendations: {
        where: { isImplemented: false },
        orderBy: { estimatedSavingsIdr: "desc" },
        select: { id: true, title: true, description: true, estimatedSavingsIdr: true },
      },
    },
  });
});

export const getPrediksiDataForBusiness = cache(async (userId: string) => {
  const activeBusinessId = await getActiveBusinessId(userId);
  if (!activeBusinessId) return null;

  return db.business.findFirst({
    where: { id: activeBusinessId, userId },
    include: {
      electricityEntries: {
        orderBy: [
          { year: "desc" },
          { month: "desc" }
        ],
        take: 2,
      },
      analysisResults: {
        orderBy: [
          { year: "desc" },
          { month: "desc" }
        ],
        take: 1,
      },
      dailyUsages: {
        orderBy: { date: "asc" },
        take: 30,
      },
    },
  });
});

export const getAnomaliDataForBusiness = cache(async (userId: string) => {
  const activeBusinessId = await getActiveBusinessId(userId);
  if (!activeBusinessId) return null;

  return db.business.findFirst({
    where: { id: activeBusinessId, userId },
    include: {
      anomalies: {
        orderBy: [
          { year: "desc" },
          { month: "desc" },
          { createdAt: "desc" }
        ],
      },
      analysisResults: {
        orderBy: [
          { year: "desc" },
          { month: "desc" }
        ],
        take: 1,
      },
    },
  });
});

export const getRekomendasiDataForBusiness = cache(async (userId: string) => {
  const activeBusinessId = await getActiveBusinessId(userId);
  if (!activeBusinessId) return null;

  return db.business.findFirst({
    where: { id: activeBusinessId, userId },
    select: {
      name: true,
      type: true,
      recommendations: {
        orderBy: [
          { isImplemented: "asc" },
          { estimatedSavingsIdr: "desc" },
          { createdAt: "desc" },
        ],
        select: { id: true, title: true, description: true, estimatedSavingsIdr: true, estimatedSavingsKwh: true, difficulty: true, priority: true, impact: true, reason: true, practicalSteps: true, disclaimer: true, triggerApplianceName: true, isImplemented: true },
      },
      appliances: {
        where: { usageStatus: "ACTIVE" },
        select: { name: true, powerWatt: true, quantity: true, dailyUsageHours: true },
      },
      electricityEntries: {
        orderBy: [{ year: "desc" }, { month: "desc" }],
        take: 1,
        select: { month: true, year: true, usageKwh: true, costIdr: true },
      },
    },
  });
});

export const getPeralatanDataForBusiness = cache(async (userId: string) => {
  const activeBusinessId = await getActiveBusinessId(userId);
  if (!activeBusinessId) return null;

  return db.business.findFirst({
    where: { id: activeBusinessId, userId },
    select: {
      id: true,
      name: true,
      appliances: {
        orderBy: [{ usageStatus: "asc" }, { powerWatt: "desc" }],
        select: { id: true, name: true, powerWatt: true, quantity: true, dailyUsageHours: true, usageStatus: true },
      },
      electricityEntries: {
        orderBy: [{ year: "desc" }, { month: "desc" }],
        take: 1,
        select: { usageKwh: true, costIdr: true, month: true, year: true },
      },
    },
  });
});

export const getSimulasiDataForBusiness = cache(async (userId: string) => {
  const activeBusinessId = await getActiveBusinessId(userId);
  if (!activeBusinessId) return null;

  return db.business.findFirst({
    where: { id: activeBusinessId, userId },
    select: {
      name: true,
      type: true,
      appliances: {
        where: { usageStatus: "ACTIVE" },
        orderBy: { powerWatt: "desc" },
        select: { id: true, name: true, powerWatt: true, quantity: true, dailyUsageHours: true },
      },
      electricityEntries: {
        orderBy: [{ year: "desc" }, { month: "desc" }],
        take: 1,
        select: { usageKwh: true, costIdr: true, month: true, year: true },
      },
    },
  });
});

export const getLaporanDataForBusiness = cache(async (userId: string, month?: number, year?: number) => {
  const activeBusinessId = await getActiveBusinessId(userId);
  if (!activeBusinessId) return null;

  // If specific month/year is requested, fetch that electricity entry. Otherwise fetch latest and previous.
  const entryWhere = month && year ? { month, year } : {};

  // For specific month/year, we fetch that one and the one prior to it.
  // First, find the entries ordered to get correct latest & previous.
  const allEntries = await db.electricityEntry.findMany({
    where: { businessId: activeBusinessId, ...entryWhere },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  const latestEntry = allEntries[0];
  let entriesToTake = 2;
  let entryFilter: any = {};

  if (month && year && latestEntry) {
    // We want the selected entry and the one immediately before it chronologically in the entire DB.
    const prevEntry = await db.electricityEntry.findFirst({
      where: {
        businessId: activeBusinessId,
        OR: [
          { year: { lt: year } },
          { year: year, month: { lt: month } }
        ]
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
    const entryIds = [latestEntry.id];
    if (prevEntry) entryIds.push(prevEntry.id);
    entryFilter = { id: { in: entryIds } };
  } else {
    // Default: take latest 2
    entryFilter = {};
  }

  // Same logic for analysisResults, anomalies, monthlyReports
  const analysisWhere = month && year ? { month, year } : {};

  return db.business.findFirst({
    where: { id: activeBusinessId, userId },
    select: {
      name: true,
      type: true,
      address: true,
      powerVA: true,
      operatingHours: true,
      electricityEntries: {
        where: entryFilter,
        orderBy: [{ year: "desc" }, { month: "desc" }],
        select: { month: true, year: true, usageKwh: true, costIdr: true },
      },
      analysisResults: {
        where: analysisWhere,
        orderBy: [{ year: "desc" }, { month: "desc" }],
        take: 1,
        select: { efficiencyScore: true },
      },
      anomalies: {
        orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
        take: 10,
        select: { id: true, month: true, year: true, severity: true, description: true, usageKwh: true, expectedKwh: true },
      },
      recommendations: {
        where: { isImplemented: false },
        orderBy: [{ estimatedSavingsIdr: "desc" }, { createdAt: "desc" }],
        take: 3,
        select: { id: true, title: true, description: true, estimatedSavingsIdr: true },
      },
      monthlyReports: {
        where: analysisWhere,
        orderBy: [{ year: "desc" }, { month: "desc" }],
        take: 1,
        select: { createdAt: true, summary: true },
      },
    },
  });
});

export const getMonthlyReportsForBusiness = cache(async (userId: string) => {
  const activeBusinessId = await getActiveBusinessId(userId);
  if (!activeBusinessId) return [];

  return db.monthlyReport.findMany({
    where: { businessId: activeBusinessId },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    select: {
      id: true,
      month: true,
      year: true,
      status: true,
      summary: true,
      totalKwh: true,
      totalCostIdr: true,
      energyScore: true,
      createdAt: true,
    },
  });
});




