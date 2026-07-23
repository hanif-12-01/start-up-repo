import { eq } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import { business } from '@/server/db/schema/journey';
import { assertResourceOwner } from '@/server/policies/tenant';

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
  const db = getDb();
  return db.select().from(business).where(eq(business.userId, userId));
}

export async function getBusinessById(sessionUserId: string, businessId: string) {
  const db = getDb();
  const rows = await db.select().from(business).where(eq(business.id, businessId)).limit(1);
  if (!rows.length) return null;
  assertResourceOwner(sessionUserId, rows[0].userId);
  return rows[0];
}
