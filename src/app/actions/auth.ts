"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { safeError } from "@/lib/safe-log";
import { checkRateLimit, recordAuthAttempt } from "@/lib/rate-limit";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function registerUser(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!name || !email || !password) {
    return { error: "Semua kolom wajib diisi" };
  }

  if (password.length < 6) {
    return { error: "Password minimal harus 6 karakter" };
  }

  const identifier = email.toLowerCase();

  try {
    // Rate limit register attempts
    const allowed = await checkRateLimit(identifier, "server-action", "register");
    if (!allowed) {
      return { error: "Terlalu banyak percobaan gagal. Coba lagi beberapa menit." };
    }

    const existingUser = await db.user.findUnique({
      where: { email: identifier },
    });

    if (existingUser) {
      return { error: "Email sudah terdaftar. Silakan login." };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.user.create({
      data: {
        name,
        email: identifier,
        password: hashedPassword,
      },
    });

    await recordAuthAttempt(identifier, "server-action", "register", true);
    return { success: true };
  } catch (error) {
    safeError("register", error);
    return { error: "Terjadi kesalahan server. Coba lagi nanti." };
  }
}

/**
 * Check if the currently logged-in user is a brand-new user eligible for the
 * Pro Trial 30-day offer.  Conditions:
 *  1. User is authenticated.
 *  2. User has 0 businesses (hasn't onboarded yet).
 *  3. User has never had a PRO_TRIAL, PRO_UMKM, BUSINESS, or ENTERPRISE
 *     subscription (i.e. truly first-time / fresh signup).
 */
export async function checkIsNewUserForTrialOffer() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { isNew: false };

  const userId = session.user.id;

  // Must have 0 businesses
  const businessCount = await db.business.count({ where: { userId } });
  if (businessCount > 0) return { isNew: false };

  // Must never have had a non-FREE subscription
  const hasNonFreeHistory = await db.subscription.findFirst({
    where: {
      userId,
      plan: { code: { in: ["PRO_TRIAL", "PRO_UMKM", "BUSINESS", "ENTERPRISE"] } },
    },
  });
  if (hasNonFreeHistory) return { isNew: false };

  return { isNew: true };
}