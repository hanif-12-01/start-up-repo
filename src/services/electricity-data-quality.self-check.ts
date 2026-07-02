import assert from "node:assert/strict";
import { buildElectricityDataQualityWarnings } from "./electricity-data-quality";

const flatHistory = [
  { month: 1, year: 2026, usageKwh: 100, costIdr: 150_000 },
  { month: 2, year: 2026, usageKwh: 100, costIdr: 150_000 },
  { month: 3, year: 2026, usageKwh: 100, costIdr: 150_000 },
];

const spike = buildElectricityDataQualityWarnings(
  { month: 4, year: 2026, usageKwh: 160, costIdr: 240_000 },
  flatHistory
);
assert.ok(spike.some((warning) => /naik 60% dibanding Maret 2026/.test(warning)));
assert.ok(spike.some((warning) => /rata-rata 3 bulan terakhir/.test(warning)));

const costOnly = buildElectricityDataQualityWarnings(
  { month: 4, year: 2026, usageKwh: 103, costIdr: 220_000 },
  flatHistory
);
assert.ok(costOnly.some((warning) => /Biaya listrik naik 47%/.test(warning)));

const lowTariff = buildElectricityDataQualityWarnings(
  { month: 4, year: 2026, usageKwh: 100, costIdr: 80_000 },
  flatHistory
);
assert.ok(lowTariff.some((warning) => /lebih rendah/.test(warning)));

const skipped = buildElectricityDataQualityWarnings(
  { month: 3, year: 2026, usageKwh: 100, costIdr: 150_000 },
  [{ month: 1, year: 2026, usageKwh: 100, costIdr: 150_000 }]
);
assert.ok(skipped.some((warning) => /1 bulan yang terlewat/.test(warning)));

const normal = buildElectricityDataQualityWarnings(
  { month: 4, year: 2026, usageKwh: 110, costIdr: 165_000 },
  flatHistory
);
assert.equal(normal.length, 0);

console.log("electricity-data-quality self-check pass");