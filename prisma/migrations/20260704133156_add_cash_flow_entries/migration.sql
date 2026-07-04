-- CreateTable
CREATE TABLE "CashFlowEntry" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "revenueIdr" DOUBLE PRECISION NOT NULL,
    "grossProfitIdr" DOUBLE PRECISION,
    "marginPercent" DOUBLE PRECISION,
    "otherOperationalCostIdr" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashFlowEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CashFlowEntry_businessId_idx" ON "CashFlowEntry"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "CashFlowEntry_businessId_year_month_key" ON "CashFlowEntry"("businessId", "year", "month");

-- AddForeignKey
ALTER TABLE "CashFlowEntry" ADD CONSTRAINT "CashFlowEntry_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
