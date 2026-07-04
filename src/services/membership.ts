import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import type { BusinessMembership } from "@prisma/client";

/**
 * Membership service — sumber kebenaran tunggal untuk pertanyaan
 * "siapa boleh apa di bisnis mana".
 *
 * Semua fungsi di sini scoped per (userId, businessId). Data lain (mis. daftar
 * anggota untuk halaman "kelola staff") sengaja belum dibuat di sini — masuk
 * step selanjutnya bersama UI-nya.
 *
 * Konvensi:
 *   getXxx  → return T | null / boolean, tanpa throw.
 *   requireXxx → throw Error Bahasa Indonesia bila gagal (server-side saja;
 *                lapisan server action/route WAJIB catch dan mengubahnya jadi
 *                response ramah client).
 */

/**
 * Ambil membership ACTIVE user untuk business tertentu. Cached per request
 * (React cache) — dua panggilan dalam satu render RSC hanya menghasilkan
 * satu query DB.
 */
export const getBusinessMembership = cache(
  async (
    userId: string,
    businessId: string,
  ): Promise<BusinessMembership | null> => {
    if (!userId || !businessId) return null;
    return db.businessMembership.findFirst({
      where: {
        userId,
        businessId,
        status: "ACTIVE",
      },
    });
  },
);

export async function requireBusinessMembership(
  userId: string,
  businessId: string,
): Promise<BusinessMembership> {
  const membership = await getBusinessMembership(userId, businessId);
  if (!membership) {
    throw new Error("Anda tidak memiliki akses ke bisnis ini.");
  }
  return membership;
}

export async function isBusinessOwner(
  userId: string,
  businessId: string,
): Promise<boolean> {
  const membership = await getBusinessMembership(userId, businessId);
  return membership?.role === "BUSINESS_OWNER";
}

export async function requireBusinessOwner(
  userId: string,
  businessId: string,
): Promise<BusinessMembership> {
  const membership = await requireBusinessMembership(userId, businessId);
  if (membership.role !== "BUSINESS_OWNER") {
    throw new Error("Hanya owner bisnis yang dapat melakukan aksi ini.");
  }
  return membership;
}

/**
 * Pemilik dan staff aktif sama-sama boleh melihat cashflow, tetapi *scope*-nya
 * berbeda — pembatasan itu diterapkan oleh cashflow service, BUKAN di sini.
 * Fungsi ini hanya memutuskan "boleh masuk halaman cashflow atau tidak".
 */
export async function canViewCashflow(
  userId: string,
  businessId: string,
): Promise<BusinessMembership | null> {
  return getBusinessMembership(userId, businessId);
}

/**
 * Hanya BUSINESS_OWNER yang bisa mengubah/menghapus/approve cashflow.
 * Staff hanya bisa input (dan hasil input-nya masuk PENDING_APPROVAL — logic
 * itu ada di server action create nanti, bukan di sini).
 */
export async function canManageCashflow(
  userId: string,
  businessId: string,
): Promise<boolean> {
  return isBusinessOwner(userId, businessId);
}
