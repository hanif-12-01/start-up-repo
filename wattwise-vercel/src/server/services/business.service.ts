import { eq, and, count, sql } from 'drizzle-orm';
import { isEntitlementsEnabled } from '@/config/env';
import { getDb } from '@/server/db/client';
import { business } from '@/server/db/schema/journey';
import { getUserEntitlements, BusinessLimitExceededError } from '@/server/services/entitlement.service';

export interface CreateBusinessInput {
  name: string;
  businessType: string;
  city?: string;
  province?: string;
  address?: string;
  segment: string;
  electricalSystem: string;
  roomCount?: number;
  occupiedRoomCount?: number;
  employeeCount?: number;
  operatingDaysPerMonth?: number;
  customerType?: string;
  powerVa?: number;
  tariffRupiahPerKwh?: string;
  paymentMethod?: string;
  meterType?: string;
  businessNotes?: string;
  electricityNotes?: string;
}

export async function createBusiness(userId: string, input: CreateBusinessInput) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  const db = getDb();

  if (isEntitlementsEnabled()) {
    const entitlements = await getUserEntitlements(userId);
    if (!entitlements.canCreateBusiness) {
      throw new BusinessLimitExceededError(entitlements.plan, entitlements.limits.maxBusinesses);
    }
  }

  // Double check inside transaction with PostgreSQL transaction-scoped advisory lock for concurrency safety
  const row = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${'business_create:' + userId}))`);
    if (isEntitlementsEnabled()) {
      const entitlements = await getUserEntitlements(userId);
      const [result] = await tx
        .select({ count: count() })
        .from(business)
        .where(and(eq(business.userId, userId), eq(business.isActive, true)));

      const currentCount = Number(result?.count ?? 0);
      if (currentCount >= entitlements.limits.maxBusinesses) {
        throw new BusinessLimitExceededError(entitlements.plan, entitlements.limits.maxBusinesses);
      }
    }

    const [inserted] = await tx
      .insert(business)
      .values({
        userId,
        name: input.name,
        businessType: input.businessType,
        city: input.city || null,
        province: input.province || null,
        address: input.address || null,
        segment: input.segment,
        electricalSystem: input.electricalSystem,
        roomCount: input.roomCount ?? null,
        occupiedRoomCount: input.occupiedRoomCount ?? null,
        employeeCount: input.employeeCount ?? null,
        operatingDaysPerMonth: input.operatingDaysPerMonth ?? null,
        customerType: input.customerType || null,
        powerVa: input.powerVa ?? null,
        tariffRupiahPerKwh: input.tariffRupiahPerKwh ?? null,
        paymentMethod: input.paymentMethod || null,
        meterType: input.meterType || null,
        businessNotes: input.businessNotes || null,
        electricityNotes: input.electricityNotes || null,
      })
      .returning();

    return inserted;
  });

  return row;
}

export async function getBusinessesByUser(userId: string) {
  if (!userId) return [];
  const db = getDb();
  return db.select().from(business).where(eq(business.userId, userId));
}

export async function getBusinessById(sessionUserId: string, businessId: string) {
  if (!sessionUserId || !businessId) return null;
  const db = getDb();
  const rows = await db
    .select()
    .from(business)
    .where(and(eq(business.id, businessId), eq(business.userId, sessionUserId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getActiveBusinessById(sessionUserId: string, businessId: string) {
  const row = await getBusinessById(sessionUserId, businessId);
  return row?.isActive ? row : null;
}

export async function updateBusiness(userId: string, businessId: string, input: CreateBusinessInput) {
  const db = getDb();
  const [updated] = await db.update(business).set({
    name: input.name, businessType: input.businessType, city: input.city || null,
    province: input.province || null, address: input.address || null, segment: input.segment,
    electricalSystem: input.electricalSystem, roomCount: input.roomCount ?? null,
    occupiedRoomCount: input.occupiedRoomCount ?? null, employeeCount: input.employeeCount ?? null,
    operatingDaysPerMonth: input.operatingDaysPerMonth ?? null, customerType: input.customerType || null,
    powerVa: input.powerVa ?? null, tariffRupiahPerKwh: input.tariffRupiahPerKwh ?? null,
    paymentMethod: input.paymentMethod || null, meterType: input.meterType || null,
    businessNotes: input.businessNotes || null, electricityNotes: input.electricityNotes || null,
    updatedAt: new Date(),
  }).where(and(eq(business.id, businessId), eq(business.userId, userId), eq(business.isActive, true))).returning();
  if (!updated) throw new Error('Usaha aktif tidak ditemukan');
  return updated;
}
