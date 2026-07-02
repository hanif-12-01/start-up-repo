import assert from "node:assert/strict";
import { classifyApplianceEfficiency } from "./appliance-efficiency";

const steadyEntries = [
  { year: 2026, month: 1, usageKwh: 1200, costIdr: 1_740_000 },
  { year: 2026, month: 2, usageKwh: 1200, costIdr: 1_740_000 },
  { year: 2026, month: 3, usageKwh: 1200, costIdr: 1_740_000 },
  { year: 2026, month: 4, usageKwh: 1200, costIdr: 1_740_000 },
];

const freezer = { id: "freezer", name: "Freezer Box", powerWatt: 400, quantity: 1, dailyUsageHours: 24 };
const coldFreezer = classifyApplianceEfficiency({ businessType: "COLD_STORAGE", appliances: [freezer], electricityEntries: steadyEntries })[0];
const laundryFreezer = classifyApplianceEfficiency({ businessType: "LAUNDRY", appliances: [freezer], electricityEntries: steadyEntries })[0];

assert.equal(coldFreezer.status, "Normal");
assert.equal(laundryFreezer.status, "Boros");
assert.notEqual(coldFreezer.status, laundryFreezer.status);
assert.ok(coldFreezer.contributionPercent > 0);

const growingEntries = [
  { year: 2026, month: 1, usageKwh: 700, costIdr: 1_015_000 },
  { year: 2026, month: 2, usageKwh: 700, costIdr: 1_015_000 },
  { year: 2026, month: 3, usageKwh: 700, costIdr: 1_015_000 },
  { year: 2026, month: 4, usageKwh: 1100, costIdr: 1_595_000 },
];

const results = [
  coldFreezer,
  laundryFreezer,
  classifyApplianceEfficiency({
    businessType: "COLD_STORAGE",
    appliances: [{ id: "cold-heavy", name: "Freezer Gudang", powerWatt: 1000, quantity: 1, dailyUsageHours: 24 }],
    electricityEntries: growingEntries,
  })[0],
  classifyApplianceEfficiency({
    businessType: "LAUNDRY",
    appliances: [{ id: "dryer", name: "Dryer Laundry", powerWatt: 2000, quantity: 2, dailyUsageHours: 12 }],
    electricityEntries: growingEntries,
  })[0],
  classifyApplianceEfficiency({
    businessType: "RETAIL",
    appliances: [{ id: "lampu", name: "Lampu LED", powerWatt: 10, quantity: 10, dailyUsageHours: 8 }],
    electricityEntries: steadyEntries,
  })[0],
];

assert.deepEqual(results.map((r) => r.status), ["Normal", "Boros", "Perlu Dicek", "Sangat Boros", "Efisien"]);
for (const result of results) {
  assert.ok(result.reason.length > 0);
  assert.ok(result.practicalAdvice.length > 0);
}

console.log("appliance-efficiency self-check pass");