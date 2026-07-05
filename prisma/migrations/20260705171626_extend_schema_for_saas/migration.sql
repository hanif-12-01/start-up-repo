-- AlterTable
ALTER TABLE "Appliance" ADD COLUMN     "applianceCode" TEXT,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "mode" TEXT NOT NULL DEFAULT 'UMKM',
ADD COLUMN     "number_of_rooms" INTEGER,
ADD COLUMN     "number_of_units" INTEGER,
ADD COLUMN     "operatingDays" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "revenueRange" TEXT;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "trialEndDate" TIMESTAMP(3),
ADD COLUMN     "trialStartDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phone" TEXT,
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE "AuditReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "businessType" TEXT NOT NULL,
    "powerCapacity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "price" INTEGER NOT NULL DEFAULT 49000,
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "reportUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL,
    "deviceType" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'SIMULATION',
    "qrCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceReading" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "powerWatt" DOUBLE PRECISION NOT NULL,
    "kwhDelta" DOUBLE PRECISION NOT NULL,
    "voltage" DOUBLE PRECISION,
    "currentAmpere" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'NORMAL',

    CONSTRAINT "DeviceReading_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Device_qrCode_key" ON "Device"("qrCode");

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceReading" ADD CONSTRAINT "DeviceReading_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
