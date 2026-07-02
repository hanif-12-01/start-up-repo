-- Additive migration for AuthAttempt (rate limiting / failed login tracking).
-- Safe for `prisma migrate deploy` against production: uses IF NOT EXISTS
-- so re-running or running on a DB where the table was hand-created is a no-op.

-- CreateTable
CREATE TABLE IF NOT EXISTS "AuthAttempt" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuthAttempt_identifier_action_success_createdAt_idx"
    ON "AuthAttempt"("identifier", "action", "success", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuthAttempt_createdAt_idx"
    ON "AuthAttempt"("createdAt");
