-- AlterTable
ALTER TABLE "User" ADD COLUMN     "crmNotes" TEXT,
ADD COLUMN     "crmStage" TEXT NOT NULL DEFAULT 'Contacted';
