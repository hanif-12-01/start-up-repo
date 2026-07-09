import { APPLIANCE_CATALOG } from "../../data/appliance-catalog";
import { APPLIANCE_TEMPLATES } from "../../data/appliance-templates";
import {
  CatalogItem,
  BusinessTypeOrMode,
  EstimateKwhParams,
  EstimateCostParams,
  NormalizedApplianceDBPayload,
} from "./types";

/**
 * Retrieves the recommended appliance template list based on BusinessType or Mode.
 * Case-insensitive helper, returns an empty array if not found.
 */
export function getApplianceTemplateByBusinessType(
  businessTypeOrMode: string
): CatalogItem[] {
  if (!businessTypeOrMode) return [];

  const key = businessTypeOrMode.toUpperCase() as BusinessTypeOrMode;
  return APPLIANCE_TEMPLATES[key] || [];
}

/**
 * Retrieves a single appliance catalog item by its ID.
 */
export function getApplianceCatalogItemById(id: string): CatalogItem | undefined {
  if (!id) return undefined;
  return APPLIANCE_CATALOG.find((item) => item.id === id);
}

/**
 * Calculates estimated monthly electricity usage in kWh for an appliance.
 * Formula: (watt / 1000) * quantity * hoursPerDay * daysPerMonth
 */
export function estimateMonthlyKwh({
  watt,
  quantity,
  hoursPerDay,
  daysPerMonth,
}: EstimateKwhParams): number {
  if (watt <= 0 || quantity <= 0 || hoursPerDay <= 0 || daysPerMonth <= 0) {
    return 0;
  }
  return (watt / 1000) * quantity * hoursPerDay * daysPerMonth;
}

/**
 * Calculates estimated monthly electricity cost based on usage (kWh) and tariff.
 * Formula: monthlyKwh * tariffPerKwh
 */
export function estimateMonthlyCost({
  monthlyKwh,
  tariffPerKwh,
}: EstimateCostParams): number {
  if (monthlyKwh <= 0 || tariffPerKwh <= 0) {
    return 0;
  }
  return monthlyKwh * tariffPerKwh;
}

/**
 * Normalizes a template CatalogItem into the format expected by the Appliance DB model.
 */
export function normalizeApplianceTemplateForBusiness(
  template: CatalogItem
): NormalizedApplianceDBPayload {
  return {
    name: template.displayName,
    category: template.category || "Lainnya",
    powerWatt: template.defaultWatt,
    quantity: template.defaultQuantity,
    dailyUsageHours: template.defaultHoursPerDay,
    source: "CATALOG",
    usageStatus: "ACTIVE",
    applianceCode: `WW-CAT-${template.id.toUpperCase()}`,
  };
}
