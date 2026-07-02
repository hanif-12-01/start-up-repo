import "server-only";

import { db } from "./db";

const MAX_FAILED = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Check if identifier+ip is allowed to attempt action.
 * Returns false if rate limited.
 */
export async function checkRateLimit(
  identifier: string,
  ipAddress: string,
  action: string
): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);

  const failedCount = await db.authAttempt.count({
    where: {
      identifier,
      action,
      success: false,
      createdAt: { gte: since },
    },
  });

  return failedCount < MAX_FAILED;
}

/**
 * Record an auth attempt. Never stores passwords or tokens.
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
}
