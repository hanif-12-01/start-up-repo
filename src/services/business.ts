import { db } from "@/lib/db";
import { cookies } from "next/headers";

// Cookie name mandated by guidebook §11.1
export const ACTIVE_BUSINESS_COOKIE = "wattwise_active_business_id";

export async function getUserBusinesses(userId: string) {
  return db.business.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Read active businessId cookie, validate ownership.
 * Fallback to first business owned by user.
 * Returns null if user has no business (caller must redirect to /onboarding).
 */
export async function getActiveBusinessId(userId: string): Promise<string | null> {
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
}

export async function getActiveBusiness(userId: string) {
  const businessId = await getActiveBusinessId(userId);
  if (!businessId) return null;
  return db.business.findUnique({ where: { id: businessId } });
}

/** Guidebook-preferred helper name (§11.2). */
export async function getActiveBusinessForUser(userId: string) {
  return getActiveBusiness(userId);
}

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
