import assert from "node:assert/strict";
import { buildRecommendationReasoning } from "./recommendation-reasoning";
import type { ApplianceEfficiencyResult } from "./appliance-efficiency";

const base: Omit<ApplianceEfficiencyResult, "applianceId" | "name" | "status" | "reason" | "practicalAdvice"> = {
  monthlyKwh: 300,
  estimatedMonthlyCost: 450_000,
  contributionPercent: 55,
};

const laundryDryer: ApplianceEfficiencyResult = {
  ...base,
  applianceId: "dryer-1",
  name: "Dryer Laundry",
  status: "Boros",
  reason: "Alat tercatat berjalan lama.",
  practicalAdvice: "Atur jadwal.",
};

const freezer: ApplianceEfficiencyResult = {
  ...base,
  applianceId: "freezer-1",
  name: "Freezer Box",
  status: "Perlu Dicek",
  reason: "Kontribusi freezer sangat tinggi.",
  practicalAdvice: "Cek gasket.",
};

const laundry = buildRecommendationReasoning({ businessType: "LAUNDRY", appliances: [laundryDryer] });
assert.equal(laundry.length, 1);
assert.equal(laundry[0].triggerApplianceName, "Dryer Laundry");
assert.match(laundry[0].reason, /55%/);
assert.match(laundry[0].practicalSteps.join(" "), /Batching/i);
assert.ok(laundry[0].estimatedSavingKwh > 0);
assert.ok(laundry[0].estimatedSavingIdr > 0);

const cold = buildRecommendationReasoning({ businessType: "COLD_STORAGE", appliances: [freezer] });
assert.equal(cold.length, 1);
assert.match(cold[0].practicalSteps.join(" "), /gasket/i);
assert.match(cold[0].practicalSteps.join(" "), /buka-tutup/i);

console.log("recommendation-reasoning self-check pass");