// Assert-based self-check for scenario-simulator. Run: npx ts-node src/services/scenario-simulator.self-check.ts
import assert from "node:assert";
import {
  resolveTariff,
  simulateReduceHours,
  simulateLowerWatt,
  simulateTargetPercent,
  monthlyKwh,
  type ScenarioAppliance,
} from "./scenario-simulator";

const ac: ScenarioAppliance = { id: "1", name: "AC", powerWatt: 1000, quantity: 2, dailyUsageHours: 10 };

// monthlyKwh: 1000*2*10*30/1000 = 600
assert.strictEqual(monthlyKwh(1000, 2, 10), 600, "monthlyKwh formula");

// tariff resolution
assert.deepStrictEqual(resolveTariff(1_450_000, 1000), { tariff: 1450, isEstimated: false }, "real tariff");
assert.deepStrictEqual(resolveTariff(null, null), { tariff: 1450, isEstimated: true }, "fallback tariff");

// reduce hours 10 -> 8 => before 600, after 480, saved 120
const r1 = simulateReduceHours({ appliance: ac, newHours: 8, tariff: 1450 });
assert.strictEqual(r1.beforeKwh, 600);
assert.strictEqual(r1.afterKwh, 480);
assert.strictEqual(r1.savedKwh, 120);
assert.strictEqual(r1.savedIdr, 120 * 1450);
assert.strictEqual(r1.savedPercent, 20);

// clamp: newHours above current => no saving
const r1b = simulateReduceHours({ appliance: ac, newHours: 99, tariff: 1450 });
assert.strictEqual(r1b.savedKwh, 0, "clamp hours");

// lower watt 1000 -> 700 => before 600, after 420, saved 180
const r2 = simulateLowerWatt({ appliance: ac, newPowerWatt: 700, tariff: 1450 });
assert.strictEqual(r2.beforeKwh, 600);
assert.strictEqual(r2.afterKwh, 420);
assert.strictEqual(r2.savedKwh, 180);

// clamp: higher watt => no saving
const r2b = simulateLowerWatt({ appliance: ac, newPowerWatt: 5000, tariff: 1450 });
assert.strictEqual(r2b.savedKwh, 0, "clamp watt");

// target percent: total 600 kWh, bill 1_000_000, 10% => saved 100k, 60 kWh
const t1 = simulateTargetPercent({ appliances: [ac], targetPercent: 10, tariff: 1450, currentBillIdr: 1_000_000 });
assert.strictEqual(t1.targetSavedIdr, 100_000);
assert.strictEqual(t1.targetSavedKwh, 60);
assert.strictEqual(t1.targetMonthlyIdr, 900_000);
assert.strictEqual(t1.isRealistic, true);

// 50% target unrealistic
const t2 = simulateTargetPercent({ appliances: [ac], targetPercent: 50, tariff: 1450, currentBillIdr: 1_000_000 });
assert.strictEqual(t2.isRealistic, false, "50% unrealistic");

// empty appliances safe
const t3 = simulateTargetPercent({ appliances: [], targetPercent: 10, tariff: 1450, currentBillIdr: null });
assert.strictEqual(t3.currentMonthlyKwh, 0);

console.log("scenario-simulator.self-check: OK");
