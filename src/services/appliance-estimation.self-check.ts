import assert from "node:assert/strict";
import { estimateMonthlyCost, estimateMonthlyKwh } from "./appliance-estimation";

const ac = { powerWatt: 500, quantity: 2, dailyUsageHours: 8 };

assert.equal(estimateMonthlyKwh(ac), 240);
assert.equal(estimateMonthlyCost(ac, 1450), 348_000);

console.log("appliance-estimation self-check pass");