import { BusinessType } from "@prisma/client";

export interface PredictionEngineInput {
  businessId: string;
  businessType: BusinessType;
  month: number;
  year: number;
  // Chronological array of electricity entries (newest to oldest, as fetched by DB)
  historicalEntries: Array<{
    month: number;
    year: number;
    usageKwh: number;
    costIdr: number;
  }>;
}

export interface PredictionEngineResult {
  predictedUsageKwh: number;
  predictedCostIdr: number;
  trendDirection: "NAIK" | "TURUN" | "STABIL";
  trendPercent: number;
  confidenceLevel: "HIGH" | "MEDIUM" | "LOW";
  confidenceReason: string;
  method: string;
  modelVersion: string;
  explanation: string;
  disclaimer: string;
}
