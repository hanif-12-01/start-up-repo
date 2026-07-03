// Scenario Simulator — pure, deterministic "what-if" calculations.
// Reuses the same formula as the analysis/efficiency engines:
//   monthlyKwh = powerWatt * quantity * dailyUsageHours * 30 / 1000
// All results are ESTIMATES and never persisted as real data.

export interface ScenarioAppliance {
  id: string;
  name: string;
  powerWatt: number;
  quantity: number;
  dailyUsageHours: number;
}

export type ScenarioType = "reduce_hours" | "lower_watt" | "target_percent" | "maintenance";

const FALLBACK_TARIFF = 1450;

export function resolveTariff(latestEntryCost?: number | null, latestEntryKwh?: number | null): {
  tariff: number;
  isEstimated: boolean;
} {
  if (latestEntryCost && latestEntryKwh && latestEntryKwh > 0) {
    return { tariff: Math.round(latestEntryCost / latestEntryKwh), isEstimated: false };
  }
  return { tariff: FALLBACK_TARIFF, isEstimated: true };
}

export function monthlyKwh(powerWatt: number, quantity: number, dailyUsageHours: number): number {
  return (powerWatt * quantity * dailyUsageHours * 30) / 1000;
}

export interface ScenarioResult {
  applianceName: string;
  scenarioType: ScenarioType;
  beforeKwh: number;
  afterKwh: number;
  savedKwh: number;
  beforeIdr: number;
  afterIdr: number;
  savedIdr: number;
  savedPercent: number;
  assumption: string;
  disclaimer: string;
}

const DISCLAIMER =
  "Hasil simulasi adalah estimasi berbasis aturan, bukan tagihan resmi PLN. Data peralatan asli Anda tidak diubah.";

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

/**
 * Reduce daily usage hours of ONE appliance to `newHours`.
 */
export function simulateReduceHours({
  appliance,
  newHours,
  tariff,
}: {
  appliance: ScenarioAppliance;
  newHours: number;
  tariff: number;
}): ScenarioResult {
  const safeNew = Math.max(0, Math.min(newHours, appliance.dailyUsageHours));
  const beforeKwh = monthlyKwh(appliance.powerWatt, appliance.quantity, appliance.dailyUsageHours);
  const afterKwh = monthlyKwh(appliance.powerWatt, appliance.quantity, safeNew);
  return buildResult({
    appliance,
    scenarioType: "reduce_hours",
    beforeKwh,
    afterKwh,
    tariff,
    assumption: `Jam pakai per hari dikurangi dari ${round1(appliance.dailyUsageHours)} jam menjadi ${round1(safeNew)} jam.`,
  });
}

/**
 * Replace ONE appliance with a lower-wattage unit (same qty & hours).
 */
export function simulateLowerWatt({
  appliance,
  newPowerWatt,
  tariff,
}: {
  appliance: ScenarioAppliance;
  newPowerWatt: number;
  tariff: number;
}): ScenarioResult {
  const safeWatt = Math.max(0, Math.min(newPowerWatt, appliance.powerWatt));
  const beforeKwh = monthlyKwh(appliance.powerWatt, appliance.quantity, appliance.dailyUsageHours);
  const afterKwh = monthlyKwh(safeWatt, appliance.quantity, appliance.dailyUsageHours);
  return buildResult({
    appliance,
    scenarioType: "lower_watt",
    beforeKwh,
    afterKwh,
    tariff,
    assumption: `Daya alat diganti dari ${Math.round(appliance.powerWatt)} W menjadi ${Math.round(safeWatt)} W (unit lebih hemat), jumlah & jam pakai tetap.`,
  });
}

export function simulateMaintenance({
  appliance,
  savingPercent,
  tariff,
}: {
  appliance: ScenarioAppliance;
  savingPercent: number;
  tariff: number;
}): ScenarioResult {
  const pct = Math.max(0, Math.min(30, savingPercent));
  const beforeKwh = monthlyKwh(appliance.powerWatt, appliance.quantity, appliance.dailyUsageHours);
  const afterKwh = beforeKwh * (1 - pct / 100);
  return buildResult({
    appliance,
    scenarioType: "maintenance",
    beforeKwh,
    afterKwh,
    tariff,
    assumption: "Servis/perawatan alat menurunkan konsumsi sekitar " + pct + "% melalui gasket rapat, filter bersih, defrost/kondensor normal, atau aliran udara lebih baik.",
  });
}

function buildResult({
  appliance,
  scenarioType,
  beforeKwh,
  afterKwh,
  tariff,
  assumption,
}: {
  appliance: ScenarioAppliance;
  scenarioType: ScenarioType;
  beforeKwh: number;
  afterKwh: number;
  tariff: number;
  assumption: string;
}): ScenarioResult {
  const savedKwh = Math.max(0, beforeKwh - afterKwh);
  const beforeIdr = Math.round(beforeKwh * tariff);
  const afterIdr = Math.round(afterKwh * tariff);
  const savedIdr = Math.max(0, beforeIdr - afterIdr);
  const savedPercent = beforeKwh > 0 ? Math.round((savedKwh / beforeKwh) * 100) : 0;
  return {
    applianceName: appliance.name,
    scenarioType,
    beforeKwh: round1(beforeKwh),
    afterKwh: round1(afterKwh),
    savedKwh: round1(savedKwh),
    beforeIdr,
    afterIdr,
    savedIdr,
    savedPercent,
    assumption,
    disclaimer: DISCLAIMER,
  };
}

export interface TargetScenarioResult {
  targetPercent: number;
  currentMonthlyKwh: number;
  currentMonthlyIdr: number;
  targetSavedKwh: number;
  targetSavedIdr: number;
  targetMonthlyIdr: number;
  requiredDailyHourCut: number; // avg hours/day to trim across all appliances
  isRealistic: boolean;
  disclaimer: string;
}

/**
 * Whole-business target: "I want to cut X% of my bill" → how much kWh/Idr & required effort.
 */
export function simulateTargetPercent({
  appliances,
  targetPercent,
  tariff,
  currentBillIdr,
}: {
  appliances: ScenarioAppliance[];
  targetPercent: number;
  tariff: number;
  currentBillIdr?: number | null;
}): TargetScenarioResult {
  const totalKwh = appliances.reduce(
    (sum, a) => sum + monthlyKwh(a.powerWatt, a.quantity, a.dailyUsageHours),
    0
  );
  const currentMonthlyIdr = currentBillIdr && currentBillIdr > 0 ? Math.round(currentBillIdr) : Math.round(totalKwh * tariff);
  const pct = Math.max(0, Math.min(100, targetPercent));
  const targetSavedKwh = round1((totalKwh * pct) / 100);
  const targetSavedIdr = Math.round((currentMonthlyIdr * pct) / 100);
  // required avg daily kWh cut → convert to "hours" using average power draw of the fleet
  const avgHourlyKwh =
    appliances.reduce((sum, a) => sum + (a.powerWatt * a.quantity) / 1000, 0) || 1;
  const requiredDailyHourCut = round1(((targetSavedKwh / 30) / avgHourlyKwh) || 0);
  // Realistic if the required daily cut is achievable (< 25% of total usage hours-equivalent)
  const isRealistic = pct <= 30;
  return {
    targetPercent: pct,
    currentMonthlyKwh: round1(totalKwh),
    currentMonthlyIdr,
    targetSavedKwh,
    targetSavedIdr,
    targetMonthlyIdr: currentMonthlyIdr - targetSavedIdr,
    requiredDailyHourCut,
    isRealistic,
    disclaimer: DISCLAIMER,
  };
}
