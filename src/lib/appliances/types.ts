export type ConfidenceLevel = "GENERAL_ESTIMATE" | "COMMON_MARKET_RANGE" | "USER_CUSTOM";

export interface CatalogItem {
  id: string;
  category: string;
  displayName: string;
  aliases: string[];
  defaultWatt: number;
  minWatt: number;
  maxWatt: number;
  defaultQuantity: number;
  defaultHoursPerDay: number;
  defaultDaysPerMonth: number;
  usageNote: string;
  confidence: ConfidenceLevel;
  canCustomize: boolean;
}

export type BusinessTypeOrMode =
  | "KOS_PROPERTY"
  | "LAUNDRY"
  | "FNB"
  | "COLD_STORAGE"
  | "RETAIL"
  | "MANUFACTURE"
  | "OTHER";

export interface EstimateKwhParams {
  watt: number;
  quantity: number;
  hoursPerDay: number;
  daysPerMonth: number;
}

export interface EstimateCostParams {
  monthlyKwh: number;
  tariffPerKwh: number;
}

export interface NormalizedApplianceDBPayload {
  name: string;
  category: string;
  powerWatt: number;
  quantity: number;
  dailyUsageHours: number;
  source: string;
  usageStatus: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
  applianceCode: string;
}
