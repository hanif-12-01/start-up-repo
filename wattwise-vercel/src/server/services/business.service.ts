import { eq, and } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import { business } from '@/server/db/schema/journey';

export interface CreateBusinessInput {
  name: string;
  businessType: string;
  city?: string;
  segment: string;
  electricalSystem: string;
  roomCount?: number;
}

export async function createBusiness(userId: string, input: CreateBusinessInput) {
  const db = getDb();

  const [row] = await db
    .insert(business)
    .values({
      userId,
      name: input.name,
      businessType: input.businessType,
      city: input.city || null,
      segment: input.segment,
      electricalSystem: input.electricalSystem,
      roomCount: input.roomCount ?? null,
    })
    .returning();

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
