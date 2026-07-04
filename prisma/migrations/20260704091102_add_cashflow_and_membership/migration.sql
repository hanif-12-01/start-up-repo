-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('BUSINESS_OWNER', 'BUSINESS_STAFF');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'PENDING', 'REVOKED');

-- CreateEnum
CREATE TYPE "CashflowDirection" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "CashflowType" AS ENUM ('SALES', 'SERVICE_INCOME', 'OTHER_INCOME', 'ELECTRICITY_BILL', 'RAW_MATERIAL', 'SALARY', 'RENT', 'WATER', 'INTERNET', 'MAINTENANCE', 'TRANSPORT', 'OTHER_EXPENSE');

-- CreateEnum
CREATE TYPE "CashflowSource" AS ENUM ('MANUAL', 'AUTO_ELECTRICITY', 'AUTO_PREDICTION', 'IMPORT');

-- CreateEnum
CREATE TYPE "CashflowStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "BusinessMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "invitedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cashflow" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "direction" "CashflowDirection" NOT NULL,
    "type" "CashflowType" NOT NULL,
    "amountIdr" BIGINT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "description" TEXT,
    "referenceNo" TEXT,
    "source" "CashflowSource" NOT NULL DEFAULT 'MANUAL',
    "status" "CashflowStatus" NOT NULL DEFAULT 'APPROVED',
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "sourceElectricityEntryId" TEXT,
    "sourcePredictionResultId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cashflow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusinessMembership_businessId_idx" ON "BusinessMembership"("businessId");

-- CreateIndex
CREATE INDEX "BusinessMembership_userId_idx" ON "BusinessMembership"("userId");

-- CreateIndex
CREATE INDEX "BusinessMembership_status_idx" ON "BusinessMembership"("status");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessMembership_userId_businessId_key" ON "BusinessMembership"("userId", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "Cashflow_sourceElectricityEntryId_key" ON "Cashflow"("sourceElectricityEntryId");

-- CreateIndex
CREATE INDEX "Cashflow_businessId_occurredAt_idx" ON "Cashflow"("businessId", "occurredAt");

-- CreateIndex
CREATE INDEX "Cashflow_businessId_month_year_idx" ON "Cashflow"("businessId", "month", "year");

-- CreateIndex
CREATE INDEX "Cashflow_businessId_status_idx" ON "Cashflow"("businessId", "status");

-- CreateIndex
CREATE INDEX "Cashflow_createdById_idx" ON "Cashflow"("createdById");

-- CreateIndex
CREATE INDEX "Cashflow_direction_idx" ON "Cashflow"("direction");

-- CreateIndex
CREATE INDEX "Cashflow_type_idx" ON "Cashflow"("type");

-- CreateIndex
CREATE INDEX "Cashflow_source_idx" ON "Cashflow"("source");

-- CreateIndex
CREATE INDEX "Cashflow_deletedAt_idx" ON "Cashflow"("deletedAt");

-- AddForeignKey
ALTER TABLE "BusinessMembership" ADD CONSTRAINT "BusinessMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessMembership" ADD CONSTRAINT "BusinessMembership_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cashflow" ADD CONSTRAINT "Cashflow_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cashflow" ADD CONSTRAINT "Cashflow_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cashflow" ADD CONSTRAINT "Cashflow_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cashflow" ADD CONSTRAINT "Cashflow_sourceElectricityEntryId_fkey" FOREIGN KEY ("sourceElectricityEntryId") REFERENCES "ElectricityEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cashflow" ADD CONSTRAINT "Cashflow_sourcePredictionResultId_fkey" FOREIGN KEY ("sourcePredictionResultId") REFERENCES "PredictionResult"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: setiap Business existing dapat BusinessMembership sebagai
-- BUSINESS_OWNER aktif, memakai Business.userId sebagai anggota.
-- Guard NOT EXISTS menjaga step tetap idempotent (aman diulang di dev).
-- gen_random_uuid() tersedia lewat ekstensi pgcrypto (aktif by default di Supabase).
INSERT INTO "BusinessMembership" (
  "id",
  "userId",
  "businessId",
  "role",
  "status",
  "invitedBy",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  b."userId",
  b."id",
  'BUSINESS_OWNER'::"MembershipRole",
  'ACTIVE'::"MembershipStatus",
  NULL,
  NOW(),
  NOW()
FROM "Business" b
WHERE NOT EXISTS (
  SELECT 1
  FROM "BusinessMembership" m
  WHERE m."userId" = b."userId"
    AND m."businessId" = b."id"
);
