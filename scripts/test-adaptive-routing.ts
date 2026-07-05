/**
 * Test script to verify routing ranges and fallback logic of the Adaptive Prediction Engine.
 */

// Stub server-only before import
{
  const resolved = require.resolve("server-only");
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports: {},
    children: [],
    paths: [],
  } as unknown as NodeJS.Module;
}

import { routeAndPredict, PredictionEngineInput } from "../src/lib/prediction";

// Helper to generate mock historical entries
function makeHistory(
  monthsCount: number,
  baseUsage = 200,
  constant = false
): Array<{ month: number; year: number; usageKwh: number; costIdr: number }> {
  const list: Array<{ month: number; year: number; usageKwh: number; costIdr: number }> = [];
  let currentMonth = 5;
  let currentYear = 2026;

  for (let i = 0; i < monthsCount; i++) {
    const usage = constant ? baseUsage : baseUsage * (1 + 0.05 * Math.sin(i));
    list.push({
      month: currentMonth,
      year: currentYear,
      usageKwh: usage,
      costIdr: usage * 1450,
    });

    currentMonth--;
    if (currentMonth === 0) {
      currentMonth = 12;
      currentYear--;
    }
  }
  return list;
}

function runTests() {
  console.log("==========================================================");
  console.log(" Running Adaptive Model Routing Integration Tests");
  console.log("==========================================================\n");

  let passes = 0;
  let fails = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passes++;
    } else {
      console.error(`[FAIL] ${message}`);
      fails++;
    }
  }

  // Test Case 1: Less than 3 months of data -> Rule-Based
  try {
    const input: PredictionEngineInput = {
      businessId: "test-biz-1",
      businessType: "LAUNDRY",
      month: 6,
      year: 2026,
      historicalEntries: makeHistory(2),
    };
    const result = routeAndPredict(input);
    assert(result.method === "RULE_BASED", `Data < 3 months routes to RULE_BASED (got: ${result.method})`);
    assert(result.modelVersion === "Rule-Based v1.0", `Rule-based model version is correct (got: ${result.modelVersion})`);
  } catch (err: any) {
    assert(false, `Test Case 1 failed with error: ${err.message}`);
  }

  // Test Case 2: 3 to 5 months of data -> Tabular model (Ridge)
  try {
    const input: PredictionEngineInput = {
      businessId: "test-biz-2",
      businessType: "FNB",
      month: 6,
      year: 2026,
      historicalEntries: makeHistory(4),
    };
    const result = routeAndPredict(input);
    assert(result.method === "TABULAR_UMKM_V1", `Data 3-5 months routes to TABULAR_UMKM_V1 (got: ${result.method})`);
    assert(result.modelVersion === "Gradient Boosting UMKM v1.0", `Tabular model version is correct (got: ${result.modelVersion})`);
    assert(result.confidenceLevel === "MEDIUM" || result.confidenceLevel === "LOW", `GB confidence level mapped correctly (got: ${result.confidenceLevel})`);
  } catch (err: any) {
    assert(false, `Test Case 2 failed with error: ${err.message}`);
  }

  // Test Case 3: 6 to 23 months of data -> LSTM Model
  try {
    const input: PredictionEngineInput = {
      businessId: "test-biz-3",
      businessType: "RETAIL",
      month: 6,
      year: 2026,
      historicalEntries: makeHistory(12),
    };
    const result = routeAndPredict(input);
    assert(result.method === "LSTM_PROTOTYPE", `Data >= 6 months routes to LSTM_PROTOTYPE (got: ${result.method})`);
    assert(result.modelVersion === "LSTM UMKM v0.1", `LSTM model version is correct (got: ${result.modelVersion})`);
    assert(result.confidenceLevel === "HIGH", `LSTM confidence level mapped correctly for known type (got: ${result.confidenceLevel})`);
  } catch (err: any) {
    assert(false, `Test Case 3 failed with error: ${err.message}`);
  }

  // Test Case 4: >= 24 months of data -> LSTM with Long-History Hook
  try {
    const input: PredictionEngineInput = {
      businessId: "test-biz-4",
      businessType: "MANUFACTURE",
      month: 6,
      year: 2026,
      historicalEntries: makeHistory(25),
    };
    const result = routeAndPredict(input);
    assert(result.method === "LSTM_PROTOTYPE", `Data >= 24 months falls back to LSTM_PROTOTYPE (got: ${result.method})`);
    assert(result.modelVersion === "LSTM UMKM v0.1 (Long-History Hook)", `Long-history hook model version is annotated (got: ${result.modelVersion})`);
  } catch (err: any) {
    assert(false, `Test Case 4 failed with error: ${err.message}`);
  }

  // Test Case 5: Out of bounds sanity fallback -> HYBRID_FALLBACK
  try {
    const input: PredictionEngineInput = {
      businessId: "test-biz-5",
      businessType: "RETAIL",
      month: 6,
      year: 2026,
      historicalEntries: [
        { month: 5, year: 2026, usageKwh: 5.0, costIdr: 7250 }, // extremely low current usage!
        { month: 4, year: 2026, usageKwh: 100.0, costIdr: 145000 },
        { month: 3, year: 2026, usageKwh: 100.0, costIdr: 145000 },
        { month: 2, year: 2026, usageKwh: 100.0, costIdr: 145000 },
      ],
    };
    const result = routeAndPredict(input);
    assert(result.method === "HYBRID_FALLBACK", `Out of bounds prediction falls back to HYBRID_FALLBACK (got: ${result.method})`);
    assert(result.confidenceLevel === "LOW", `Fallback confidence level is LOW (got: ${result.confidenceLevel})`);
  } catch (err: any) {
    assert(false, `Test Case 5 failed with error: ${err.message}`);
  }

  console.log("\n==========================================================");
  console.log(` Tests Finished: ${passes} passed, ${fails} failed.`);
  console.log("==========================================================");

  if (fails > 0) {
    process.exit(1);
  }
}

runTests();
