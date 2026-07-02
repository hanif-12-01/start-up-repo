import "server-only";

import { db } from "./db";

// Per identifier+IP+action cap (protects one user on one device/network)
const MAX_FAILED_PER_IDENTIFIER_IP = 5;

// Per IP cap across all identifiers (blocks attackers hopping emails)
const MAX_FAILED_PER_IP = 25;

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Marker string embedded in thrown Error message so UI can distinguish
 * rate-limit rejection from generic invalid credentials.
 */
export const RATE_LIMIT_ERROR = "Terlalu banyak percobaan gagal. Coba lagi beberapa menit.";

/**
 * Check if identifier+ip is allowed to attempt action.
 * Returns false if either the per-identifier+IP or the per-IP cap is exceeded.
 * This prevents one attacker from globally locking a public/demo email
 * for other users on different IPs.
 */
export async function checkRateLimit(
  identifier: string,
  ipAddress: string,
  action: string
): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);

  const [failedForIdentifierIp, failedForIp] = await Promise.all([
    db.authAttempt.count({
      where: {
        identifier,
        ipAddress,
        action,
        success: false,
        createdAt: { gte: since },
      },
    }),
    db.authAttempt.count({
      where: {
        ipAddress,
        action,
        success: false,
        createdAt: { gte: since },
      },
    }),
  ]);

  if (failedForIdentifierIp >= MAX_FAILED_PER_IDENTIFIER_IP) return false;
  if (failedForIp >= MAX_FAILED_PER_IP) return false;
  return true;
}

/**
 * Record an auth attempt. Never stores passwords or tokens.
 * On successful login, clear prior failed attempts for the same
 * identifier+ipAddress+action so the user is not penalized after
 * proving they know the password.
 */
export async function recordAuthAttempt(
  identifier: string,
  ipAddress: string,
  action: string,
  success: boolean
): Promise<void> {
  await db.authAttempt.create({
    data: { identifier, ipAddress, action, success },
  });

  if (success) {
    await db.authAttempt.deleteMany({
      where: { identifier, ipAddress, action, success: false },
    });
  }
}
