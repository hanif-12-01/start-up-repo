import { and, asc, desc, eq } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import {
  appliance,
  business,
  electricityBill,
  revenueEntry,
  user,
  userPreference,
  type Appliance,
  type RevenueEntry,
} from '@/server/db/schema';

export class WorkspaceUnavailableError extends Error {}
export class WorkspaceBusinessNotFoundError extends Error {}

export interface WorkspaceContext {
  business: typeof business.$inferSelect;
  businesses: Array<typeof business.$inferSelect>;
}

export interface ApplianceTemplateItem {
  name: string;
  category: string;
  powerWatts: number | null;
  dailyHours: string | null;
  quantity: number;
  operatingDays: number;
}

const TEMPLATE_CATALOG: Record<string, ApplianceTemplateItem[]> = {
  KOS: [
    { name: 'AC kamar', category: 'Pendingin ruangan', powerWatts: 500, dailyHours: '8', quantity: 1, operatingDays: 30 },
    { name: 'Pompa air', category: 'Sistem air', powerWatts: 250, dailyHours: '2', quantity: 1, operatingDays: 30 },
    { name: 'Lampu area bersama', category: 'Pencahayaan', powerWatts: 12, dailyHours: '10', quantity: 6, operatingDays: 30 },
  ],
  LAUNDRY: [
    { name: 'Mesin cuci', category: 'Mesin produksi', powerWatts: 500, dailyHours: '8', quantity: 2, operatingDays: 26 },
    { name: 'Mesin pengering', category: 'Pemanas', powerWatts: 1800, dailyHours: '5', quantity: 1, operatingDays: 26 },
    { name: 'Setrika uap', category: 'Pemanas', powerWatts: 900, dailyHours: '6', quantity: 2, operatingDays: 26 },
  ],
  FNB: [
    { name: 'Kulkas penyimpanan', category: 'Pendingin', powerWatts: 180, dailyHours: '24', quantity: 2, operatingDays: 30 },
    { name: 'Freezer', category: 'Pendingin', powerWatts: 250, dailyHours: '24', quantity: 1, operatingDays: 30 },
    { name: 'Peralatan masak listrik', category: 'Dapur', powerWatts: 1200, dailyHours: '4', quantity: 1, operatingDays: 30 },
  ],
  COLD_STORAGE: [
    { name: 'Unit pendingin utama', category: 'Pendingin', powerWatts: 1500, dailyHours: '24', quantity: 1, operatingDays: 30 },
    { name: 'Kipas sirkulasi', category: 'Ventilasi', powerWatts: 120, dailyHours: '24', quantity: 2, operatingDays: 30 },
  ],
  RETAIL: [
    { name: 'AC ruang usaha', category: 'Pendingin ruangan', powerWatts: 750, dailyHours: '10', quantity: 1, operatingDays: 30 },
    { name: 'Lampu etalase', category: 'Pencahayaan', powerWatts: 15, dailyHours: '12', quantity: 8, operatingDays: 30 },
    { name: 'Kulkas display', category: 'Pendingin', powerWatts: 220, dailyHours: '24', quantity: 1, operatingDays: 30 },
  ],
  OTHER: [
    { name: 'Pendingin ruangan', category: 'Pendingin ruangan', powerWatts: 750, dailyHours: '8', quantity: 1, operatingDays: 26 },
    { name: 'Pencahayaan usaha', category: 'Pencahayaan', powerWatts: 15, dailyHours: '10', quantity: 6, operatingDays: 26 },
  ],
};

function daysInclusive(start: string, end: string): number {
  const startAt = Date.parse(`${start}T00:00:00.000Z`);
  const endAt = Date.parse(`${end}T00:00:00.000Z`);
  return Math.max(1, Math.round((endAt - startAt) / 86_400_000) + 1);
}

export function estimateMonthlyKwh(item: Pick<Appliance, 'powerWatts' | 'dailyHours' | 'quantity' | 'operatingDays'>): number | null {
  if (item.powerWatts === null || item.dailyHours === null) return null;
  return (item.powerWatts * Number(item.dailyHours) * item.quantity * item.operatingDays) / 1000;
}

export async function getWorkspaceContext(userId: string, requestedBusinessId?: string): Promise<WorkspaceContext> {
  const db = getDb();
  const businesses = await db
    .select()
    .from(business)
    .where(and(eq(business.userId, userId), eq(business.isActive, true)))
    .orderBy(asc(business.createdAt), asc(business.id));

  if (businesses.length === 0) throw new WorkspaceUnavailableError('No active business');
  const selected = requestedBusinessId
    ? businesses.find((item) => item.id === requestedBusinessId)
    : businesses[0];
  if (!selected) throw new WorkspaceBusinessNotFoundError('Business not found');
  return { business: selected, businesses };
}

export async function getPortfolio(userId: string) {
  const db = getDb();
  const businesses = await db
    .select()
    .from(business)
    .where(eq(business.userId, userId))
    .orderBy(desc(business.isActive), asc(business.createdAt));

  const summaries = await Promise.all(
    businesses.map(async (item) => {
      const [latestBill] = await db
        .select()
        .from(electricityBill)
        .where(eq(electricityBill.businessId, item.id))
        .orderBy(desc(electricityBill.periodEnd))
        .limit(1);
      return { ...item, latestBill: latestBill ?? null };
    })
  );
  return summaries;
}

export async function updateBusinessStatus(userId: string, businessId: string, isActive: boolean) {
  const db = getDb();
  const [owned] = await db
    .select({ id: business.id })
    .from(business)
    .where(and(eq(business.id, businessId), eq(business.userId, userId)))
    .limit(1);
  if (!owned) throw new WorkspaceBusinessNotFoundError('Business not found');
  await db.update(business).set({ isActive, updatedAt: new Date() }).where(eq(business.id, businessId));
}

export async function listRevenueEntries(userId: string, requestedBusinessId?: string) {
  const context = await getWorkspaceContext(userId, requestedBusinessId);
  const rows = await getDb()
    .select()
    .from(revenueEntry)
    .where(eq(revenueEntry.businessId, context.business.id))
    .orderBy(desc(revenueEntry.periodMonth));
  return { ...context, entries: rows };
}

export async function saveRevenueEntry(
  userId: string,
  input: Pick<RevenueEntry, 'businessId' | 'periodMonth' | 'amountRupiah' | 'inputMode' | 'notes'>
) {
  await getWorkspaceContext(userId, input.businessId);
  const db = getDb();
  await db
    .insert(revenueEntry)
    .values({ ...input, id: crypto.randomUUID(), updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [revenueEntry.businessId, revenueEntry.periodMonth],
      set: {
        amountRupiah: input.amountRupiah,
        inputMode: input.inputMode,
        notes: input.notes,
        updatedAt: new Date(),
      },
    });
}

export async function listAppliances(userId: string, requestedBusinessId?: string) {
  const context = await getWorkspaceContext(userId, requestedBusinessId);
  const rows = await getDb()
    .select()
    .from(appliance)
    .where(eq(appliance.businessId, context.business.id))
    .orderBy(desc(appliance.isActive), asc(appliance.category), asc(appliance.name));
  return { ...context, appliances: rows };
}

export async function addAppliance(
  userId: string,
  input: Omit<typeof appliance.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>
) {
  await getWorkspaceContext(userId, input.businessId);
  await getDb().insert(appliance).values({ ...input, id: crypto.randomUUID() });
}

export async function applyApplianceTemplate(userId: string, businessId: string) {
  const context = await getWorkspaceContext(userId, businessId);
  const items = TEMPLATE_CATALOG[context.business.segment] ?? TEMPLATE_CATALOG.OTHER;
  const db = getDb();
  for (const item of items) {
    await db
      .insert(appliance)
      .values({ ...item, id: crypto.randomUUID(), businessId, dataSource: 'TEMPLATE' })
      .onConflictDoNothing();
  }
}

export async function setApplianceActive(userId: string, applianceId: string, isActive: boolean) {
  const db = getDb();
  const [owned] = await db
    .select({ id: appliance.id })
    .from(appliance)
    .innerJoin(business, eq(appliance.businessId, business.id))
    .where(and(eq(appliance.id, applianceId), eq(business.userId, userId)))
    .limit(1);
  if (!owned) throw new WorkspaceBusinessNotFoundError('Appliance not found');
  await db.update(appliance).set({ isActive, updatedAt: new Date() }).where(eq(appliance.id, applianceId));
}

export async function getDecisionSupport(userId: string, requestedBusinessId?: string) {
  const context = await getWorkspaceContext(userId, requestedBusinessId);
  const db = getDb();
  const [bills, revenues, appliances] = await Promise.all([
    db.select().from(electricityBill).where(eq(electricityBill.businessId, context.business.id)).orderBy(desc(electricityBill.periodEnd)).limit(12),
    db.select().from(revenueEntry).where(eq(revenueEntry.businessId, context.business.id)).orderBy(desc(revenueEntry.periodMonth)).limit(12),
    db.select().from(appliance).where(and(eq(appliance.businessId, context.business.id), eq(appliance.isActive, true))).orderBy(asc(appliance.name)),
  ]);

  const anomalies = bills.slice(0, -1).map((current, index) => {
    const previous = bills[index + 1];
    const currentDaily = Number(current.totalAmountRupiah) / daysInclusive(current.periodStart, current.periodEnd);
    const previousDaily = Number(previous.totalAmountRupiah) / daysInclusive(previous.periodStart, previous.periodEnd);
    const changePercent = previousDaily === 0 ? null : ((currentDaily - previousDaily) / previousDaily) * 100;
    return { current, previous, currentDaily, previousDaily, changePercent };
  }).filter((item) => item.changePercent !== null && item.changePercent > 15);

  const applianceEstimates = appliances
    .map((item) => ({ appliance: item, monthlyKwh: estimateMonthlyKwh(item) }))
    .sort((a, b) => (b.monthlyKwh ?? -1) - (a.monthlyKwh ?? -1));

  const latestBill = bills[0] ?? null;
  const billMonth = latestBill ? `${latestBill.periodEnd.slice(0, 7)}-01` : null;
  const matchingRevenue = billMonth
    ? revenues.find((entry) => entry.periodMonth === billMonth) ?? null
    : null;
  const ratio = latestBill && matchingRevenue && matchingRevenue.amountRupiah > 0n
    ? (Number(latestBill.totalAmountRupiah) / Number(matchingRevenue.amountRupiah)) * 100
    : null;

  return {
    ...context,
    bills,
    revenues,
    appliances,
    applianceEstimates,
    anomalies,
    latestBill,
    matchingRevenue,
    ratio,
  };
}

export async function getUserSettings(userId: string) {
  const db = getDb();
  const [[profile], [preferences]] = await Promise.all([
    db.select({ id: user.id, name: user.name, email: user.email }).from(user).where(eq(user.id, userId)).limit(1),
    db.select().from(userPreference).where(eq(userPreference.userId, userId)).limit(1),
  ]);
  return {
    profile,
    preferences: preferences ?? {
      userId,
      billAlerts: true,
      monthlyDigest: true,
      actionReminders: true,
      appearance: 'SYSTEM',
      updatedAt: new Date(0),
    },
  };
}

export async function updateUserProfile(userId: string, name: string) {
  await getDb().update(user).set({ name, updatedAt: new Date() }).where(eq(user.id, userId));
}

export async function updateUserPreferences(
  userId: string,
  values: Pick<typeof userPreference.$inferInsert, 'billAlerts' | 'monthlyDigest' | 'actionReminders' | 'appearance'>
) {
  await getDb()
    .insert(userPreference)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: userPreference.userId, set: { ...values, updatedAt: new Date() } });
}
