/**
 * Parity test: verify TypeScript predictTabularUmkm vs Python GradientBoostingRegressor baseline.
 */

import * as fs from "node:fs";
import * as path from "node:path";

// Stub `server-only` before imports
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

import { predictTabularUmkm, TabularFeatureInput } from "../src/lib/prediction/tabular-umkm-model";

const SAMPLES_PATH = path.resolve(
  __dirname,
  "..",
  "ML",
  "outputs_model_benchmark",
  "gb_parity_samples.json"
);

interface ParitySample {
  features: Record<string, number>;
  python_pred: number;
}

function loadSamples(): ParitySample[] {
  if (!fs.existsSync(SAMPLES_PATH)) {
    throw new Error(`Parity samples file not found at: ${SAMPLES_PATH}`);
  }
  const raw = fs.readFileSync(SAMPLES_PATH, "utf-8");
  return JSON.parse(raw) as ParitySample[];
}

function runParityTest() {
  console.log("==========================================================");
  console.log(" Gradient Boosting Tabular Model TS Parity Test");
  console.log("==========================================================\n");

  const samples = loadSamples();
  console.log(`Loaded ${samples.length} validation samples.\n`);
  
  console.log(" ID | Python kWh | TS kWh     | Absolute Err | Status");
  console.log("----------------------------------------------------------");

  let passed = 0;
  let failed = 0;
  const tolerance = 0.01; // Since predictions are rounded to 2 decimal places

  samples.forEach((sample, idx) => {
    const featInput = sample.features as unknown as TabularFeatureInput;
    const tsRes = predictTabularUmkm(featInput);
    
    const diff = Math.abs(tsRes.predictedUsageKwh - sample.python_pred);
    const status = diff <= tolerance ? "PASS" : "FAIL";

    console.log(
      ` ${idx.toString().padStart(2)} | ` +
      `${sample.python_pred.toFixed(2).padStart(10)} | ` +
      `${tsRes.predictedUsageKwh.toFixed(2).padStart(10)} | ` +
      `${diff.toFixed(4).padStart(12)} | ` +
      `${status}`
    );

    if (status === "PASS") {
      passed++;
    } else {
      failed++;
    }
  });

  console.log("\n==========================================================");
  console.log(` Summary: ${passed} passed, ${failed} failed.`);
  console.log("==========================================================");

  if (failed > 0) {
    console.error("\n[FAIL] TypeScript model predictions do not match Python baseline!");
    process.exit(1);
  } else {
    console.log("\n[SUCCESS] Parity test passed. Perfect numerical alignment!");
  }
}

runParityTest();
