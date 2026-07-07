// Centralized plan entitlement helper for WattWise AI
// Re-uses and maps plan codes and feature gates safely.

export type PlanCode = "FREE" | "PRO_TRIAL" | "PRO_UMKM" | "BUSINESS" | "ENTERPRISE";

export const FEATURE_KEYS = {
  BUSINESS_CREATE: "business:create",
  BUSINESS_MULTI: "business:multi",
  BUSINESS_MAX_3: "business:max-3",
  BUSINESS_MAX_50: "business:max-50",
  BUSINESS_CUSTOM_LIMIT: "business:custom-limit",
  DASHBOARD_AGGREGATE: "dashboard:aggregate",
  DASHBOARD_BRANCH_COMPARISON: "dashboard:branch-comparison",
  PROFILE_FULL: "profile:full",
  ELECTRICITY_MANUAL_INPUT: "electricity:manual-input",
  ELECTRICITY_PROFILE_FULL: "electricity:profile-full",
  REVENUE_INPUT: "revenue:input",
  CASHFLOW_BASIC: "cashflow:basic",
  CASHFLOW_FULL: "cashflow:full",
  ELECTRICITY_REVENUE_RATIO_FULL: "electricity-revenue-ratio:full",
  REMAINING_REVENUE_FULL: "remaining-revenue:full",
  PREDICTION_BASIC: "prediction:basic",
  PREDICTION_FULL: "prediction:full",
  BILL_ESTIMATION_BASIC: "bill-estimation:basic",
  BILL_ESTIMATION_FULL: "bill-estimation:full",
  ENERGY_WASTE_SCORE: "energy-waste-score",
  SAVINGS_ESTIMATION: "savings-estimation",
  RECOMMENDATION_LIMITED: "recommendation:limited",
  RECOMMENDATION_DETAILED: "recommendation:detailed",
  ANOMALY_SIMPLE: "anomaly:simple",
  ANOMALY_FULL: "anomaly:full",
  ANOMALY_ADVANCED: "anomaly:advanced",
  RECOMMENDATION_MULTI_LOCATION: "recommendation:multi-location",
  HISTORY_12_MONTHS: "history:12-months",
  HISTORY_24_MONTHS: "history:24-months",
  HISTORY_CUSTOM: "history:custom",
  REPORT_PREVIEW: "report:preview",
  REPORT_MONTHLY_FULL: "report:monthly-full",
  REPORT_PDF_EXPORT: "report:pdf-export",
  REPORT_BULK_PDF: "report:bulk-pdf",
  REPORT_CUSTOM: "report:custom",
  REMINDER_SIMULATION: "reminder:simulation",
  REMINDER_LARGER_QUOTA: "reminder:larger-quota",
  IOT_TEASER: "iot:teaser",
  IOT_DEMO: "iot:demo",
  IOT_FULL_SIMULATION: "iot:full-simulation",
  IOT_PILOT_ROADMAP: "iot:pilot-roadmap",
  API_ROADMAP: "api:roadmap",
  DASHBOARD_CUSTOM: "dashboard:custom",
  MULTI_USER_ADMIN: "multi-user:admin",
  MULTI_USER_ADVANCED_ROLE: "multi-user:advanced-role",
  ROLE_OWNER: "role:owner",
  ROLE_ADMIN: "role:admin",
  ROLE_STAFF: "role:staff",
  ROLE_FINANCE: "role:finance",
  ROLE_VIEWER: "role:viewer",
  SUPPORT_STANDARD: "support:standard",
  SUPPORT_PRIORITY: "support:priority",
  SUPPORT_DEDICATED: "support:dedicated",
  SLA_ROADMAP: "sla:roadmap",
  CUSTOM_ONBOARDING: "custom-onboarding",
  AI_LAB_VIEW: "ai-lab:view"
} as const;

export function isTrialActive(subscription: any): boolean {
  if (!subscription) return false;
  if (subscription.status === "TRIAL_ACTIVE") {
    if (subscription.trialEndDate) {
      return new Date(subscription.trialEndDate) > new Date();
    }
    return true;
  }
  if (subscription.plan?.code === "PRO_TRIAL") {
    if (subscription.trialEndDate) {
      return new Date(subscription.trialEndDate) > new Date();
    }
    return true;
  }
  return false;
}

export function isTrialExpired(subscription: any): boolean {
  if (!subscription) return false;
  if (subscription.plan?.code === "PRO_TRIAL" || subscription.status === "TRIAL_ACTIVE") {
    if (subscription.trialEndDate) {
      return new Date(subscription.trialEndDate) <= new Date();
    }
  }
  return false;
}

export function getPlanDisplayName(code: PlanCode, trialActive = false): string {
  switch (code) {
    case "FREE":
      return "Gratis";
    case "PRO_TRIAL":
      return trialActive ? "Pro Trial 30 Hari" : "Trial Berakhir";
    case "PRO_UMKM":
      return "Pro";
    case "BUSINESS":
      return "Business";
    case "ENTERPRISE":
      return "Enterprise/Custom";
    default:
      return code;
  }
}

export function getPlanEntitlements(planCode: string, trialActive: boolean = false): string[] {
  // Free entitlements — dasar untuk semua user, termasuk trial expired.
  const freeEntitlements = [
    FEATURE_KEYS.ELECTRICITY_MANUAL_INPUT,
    FEATURE_KEYS.REVENUE_INPUT,
    FEATURE_KEYS.CASHFLOW_BASIC,
    FEATURE_KEYS.PREDICTION_BASIC,
    FEATURE_KEYS.BILL_ESTIMATION_BASIC,
    FEATURE_KEYS.RECOMMENDATION_LIMITED,
    FEATURE_KEYS.ANOMALY_SIMPLE,
    FEATURE_KEYS.REPORT_PREVIEW,
    FEATURE_KEYS.IOT_TEASER,
    FEATURE_KEYS.AI_LAB_VIEW
  ];

  // Pro features — juga dipakai PRO_TRIAL (saat masih aktif) dan PRO_UMKM.
  const proEntitlements = [
    ...freeEntitlements,
    FEATURE_KEYS.BUSINESS_CREATE,
    FEATURE_KEYS.BUSINESS_MULTI,
    FEATURE_KEYS.BUSINESS_MAX_3,
    FEATURE_KEYS.PROFILE_FULL,
    FEATURE_KEYS.ELECTRICITY_PROFILE_FULL,
    FEATURE_KEYS.CASHFLOW_FULL,
    FEATURE_KEYS.ELECTRICITY_REVENUE_RATIO_FULL,
    FEATURE_KEYS.REMAINING_REVENUE_FULL,
    FEATURE_KEYS.PREDICTION_FULL,
    FEATURE_KEYS.BILL_ESTIMATION_FULL,
    FEATURE_KEYS.ENERGY_WASTE_SCORE,
    FEATURE_KEYS.SAVINGS_ESTIMATION,
    FEATURE_KEYS.RECOMMENDATION_DETAILED,
    FEATURE_KEYS.ANOMALY_FULL,
    FEATURE_KEYS.HISTORY_12_MONTHS,
    FEATURE_KEYS.REPORT_MONTHLY_FULL,
    FEATURE_KEYS.REPORT_PDF_EXPORT,
    FEATURE_KEYS.REMINDER_SIMULATION,
    FEATURE_KEYS.IOT_DEMO,
    FEATURE_KEYS.SUPPORT_STANDARD,
  ];

  // Business features — semua Pro + agregat + multi-lokasi + multi-user role.
  // ENTERPRISE di-map ke tier yang sama untuk MVP demo (spec: "ENTERPRISE
  // should return the same entitlements as BUSINESS for now").
  const businessEntitlements = [
    ...proEntitlements,
    FEATURE_KEYS.BUSINESS_MAX_50,
    FEATURE_KEYS.DASHBOARD_AGGREGATE,
    FEATURE_KEYS.DASHBOARD_BRANCH_COMPARISON,
    FEATURE_KEYS.ANOMALY_ADVANCED,
    FEATURE_KEYS.RECOMMENDATION_MULTI_LOCATION,
    FEATURE_KEYS.HISTORY_24_MONTHS,
    FEATURE_KEYS.REPORT_BULK_PDF,
    FEATURE_KEYS.REMINDER_LARGER_QUOTA,
    FEATURE_KEYS.IOT_FULL_SIMULATION,
    FEATURE_KEYS.MULTI_USER_ADMIN,
    FEATURE_KEYS.ROLE_OWNER,
    FEATURE_KEYS.ROLE_ADMIN,
    FEATURE_KEYS.ROLE_STAFF,
    FEATURE_KEYS.SUPPORT_PRIORITY,
  ];

  // Enterprise entitlements
  const enterpriseEntitlements = [
    ...businessEntitlements,
    FEATURE_KEYS.BUSINESS_CUSTOM_LIMIT,
    FEATURE_KEYS.HISTORY_CUSTOM,
    FEATURE_KEYS.REPORT_CUSTOM,
    FEATURE_KEYS.IOT_PILOT_ROADMAP,
    FEATURE_KEYS.API_ROADMAP,
    FEATURE_KEYS.DASHBOARD_CUSTOM,
    FEATURE_KEYS.MULTI_USER_ADVANCED_ROLE,
    FEATURE_KEYS.ROLE_FINANCE,
    FEATURE_KEYS.ROLE_VIEWER,
    FEATURE_KEYS.SUPPORT_DEDICATED,
    FEATURE_KEYS.SLA_ROADMAP,
    FEATURE_KEYS.CUSTOM_ONBOARDING
  ];

  // If Pro Trial but expired, downgrade features to Free level
  if (planCode === "PRO_TRIAL" && !trialActive) {
    return freeEntitlements;
  }

  if (planCode === "FREE") return freeEntitlements;
  if (planCode === "PRO_TRIAL" || planCode === "PRO_UMKM") return proEntitlements;
  if (planCode === "BUSINESS") return businessEntitlements;
  if (planCode === "ENTERPRISE") return enterpriseEntitlements;

  return freeEntitlements;
}

export function canAccessFeature(feature: string, planCode: string, trialActive: boolean = false): boolean {
  const entitlements = getPlanEntitlements(planCode, trialActive);
  return entitlements.includes(feature);
}

// ─────────────────────────────────────────────────────────────
// Plan metadata — batasan/label yang tidak boolean tapi angka/string.
// Diakses dari service atau UI untuk menampilkan limit ke user.
// ─────────────────────────────────────────────────────────────

export interface PlanMeta {
  planCode: string;
  displayName: string;
  /** Maksimal jumlah business/property yang boleh dibuat. `null` = tanpa batas. */
  businessLimit: number | null;
  isCustomLimit?: boolean;
  /** Batas kedalaman histori data yang ditampilkan di UI (bulan). `null` = tanpa batas. */
  historyMonthsLimit: number | string | null;
  supportLevel: string;
  isTrial: boolean;
  /** UI menampilkan CTA upgrade (utamanya untuk Trial yang mau expired). */
  requiresUpgradeCta: boolean;
  isCustomPlan?: boolean;
  contactSalesRequired?: boolean;
}

export function getPlanMeta(planCode: string, trialActive: boolean = false): PlanMeta {
  switch (planCode) {
    case "FREE":
      return {
        planCode: "FREE",
        displayName: "Gratis",
        businessLimit: 1,
        historyMonthsLimit: 3,
        supportLevel: "Community",
        isTrial: false,
        requiresUpgradeCta: true,
      };
    case "PRO_TRIAL":
      // Trial mewarisi entitlement Pro; requiresUpgradeCta=true supaya UI
      // konsisten menampilkan ajakan upgrade sebelum masa trial berakhir.
      return {
        planCode: "PRO_TRIAL",
        displayName: trialActive ? "Pro Trial 30 Hari" : "Trial Berakhir",
        businessLimit: 3,
        historyMonthsLimit: 12,
        supportLevel: "Standard support",
        isTrial: true,
        requiresUpgradeCta: true,
      };
    // Support "PRO" sebagai alias legacy — canonical tetap PRO_UMKM.
    case "PRO":
    case "PRO_UMKM":
      return {
        planCode: "PRO_UMKM",
        displayName: "Pro",
        businessLimit: 3,
        historyMonthsLimit: 12,
        supportLevel: "Standard support",
        isTrial: false,
        requiresUpgradeCta: false,
      };
    case "BUSINESS":
      return {
        planCode: "BUSINESS",
        displayName: "Business",
        businessLimit: 50,
        historyMonthsLimit: 24,
        supportLevel: "Priority support",
        isTrial: false,
        requiresUpgradeCta: false,
      };
    case "ENTERPRISE":
      return {
        planCode: "ENTERPRISE",
        displayName: "Enterprise/Custom",
        businessLimit: null,
        isCustomLimit: true,
        historyMonthsLimit: "UNLIMITED",
        supportLevel: "Dedicated support",
        isTrial: false,
        requiresUpgradeCta: false,
        isCustomPlan: true,
        contactSalesRequired: true,
      };
    default:
      return {
        planCode,
        displayName: getPlanDisplayName(planCode as PlanCode, trialActive),
        businessLimit: 1,
        historyMonthsLimit: 3,
        supportLevel: "Community",
        isTrial: false,
        requiresUpgradeCta: true,
      };
  }
}
