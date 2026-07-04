/**
 * Test parity numerik: TypeScript predictLstmUmkm vs Keras baseline.
 *
 * Baseline dihasilkan oleh ML/scripts/19_generate_lstm_baseline_predictions.py
 * yang menyimpan raw (unscaled) 6-step input + prediksi Keras (unscaled kWh).
 *
 * Test PASS bila max relative error <= 1%. Kalau gagal, print diagnosis
 * kemungkinan penyebab (gate ordering, dense chain, scaling, orientation).
 */

import * as fs from "node:fs";
import * as path from "node:path";

// Stub `server-only` sebelum import lstm-umkm-model.
// `server-only` package sengaja throw kalau di-import di luar Server Component
// context. Untuk test parity Node CLI ini, guard tidak relevan (kita bukan
// client bundle). Intercept via require.cache dengan modul kosong.
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

// eslint-disable-next-line import/first
import {
  FEATURE_ORDER,
  MODEL_NAME,
  MODEL_VERSION,
  SEQUENCE_LENGTH,
  predictLstmUmkm,
  type LstmFeatureName,
  type LstmFeatureWindow,
} from "../src/lib/prediction/lstm-umkm-model";

const BASELINE_PATH = path.resolve(
  __dirname,
  "..",
  "ML",
  "outputs_lstm",
  "lstm_baseline_predictions.json",
);
const REL_ERROR_THRESHOLD = 0.01; // 1%

interface BaselineSample {
  id: number;
  business_id: string;
  business_type: string;
  current_year: number;
  current_month: number;
  raw_sequence: Record<string, number>[];
  keras_predicted_kwh: number;
  actual_kwh: number | null;
}

interface BaselinePayload {
  model_source: string;
  sequence_length: number;
  feature_order: string[];
  target_name: string;
  n_samples: number;
  samples: BaselineSample[];
}

function loadBaseline(): BaselinePayload {
  if (!fs.existsSync(BASELINE_PATH)) {
    throw new Error(
      `Baseline tidak ditemukan: ${BASELINE_PATH}\n` +
        `Jalankan dulu: python ML/scripts/19_generate_lstm_baseline_predictions.py`,
    );
  }
  const raw = fs.readFileSync(BASELINE_PATH, "utf-8");
  return JSON.parse(raw) as BaselinePayload;
}

function toWindow(rawStep: Record<string, number>): LstmFeatureWindow {
  const window = {} as LstmFeatureWindow;
  for (const feat of FEATURE_ORDER) {
    const v = rawStep[feat];
    if (typeof v !== "number" || !Number.isFinite(v)) {
      throw new Error(
        `Baseline sample corrupt: fitur "${feat}" tidak valid (${v})`,
      );
    }
    (window as Record<LstmFeatureName, number>)[feat as LstmFeatureName] = v;
  }
  return window;
}

function diagnose(maxRelError: number, samples: SampleResult[]): string[] {
  // Kalau error konsisten besar & bertanda sama → orientation atau scaler salah.
  // Kalau error random atau menumpuk di satu business_type → gate/dense mismatch.
  const hints: string[] = [];
  const signs = samples.map((s) => Math.sign(s.absError));
  const posCount = signs.filter((s) => s > 0).length;
  const negCount = signs.filter((s) => s < 0).length;

  if (posCount === samples.length || negCount === samples.length) {
    hints.push(
      "→ Semua error bertanda sama. Kemungkinan besar: (a) target inverse-transform salah " +
        "(pastikan `y_final = y_scaled * target.scale[0] + target.mean[0]`), atau " +
        "(b) input scaler dimensi salah (mean/scale bertukar), atau " +
        "(c) matrix orientation matVec salah (mungkin kernel di-transpose).",
    );
  }

  if (maxRelError > 0.1) {
    hints.push(
      "→ Error > 10% mengindikasikan gate slicing atau dense chain salah. " +
        "Cek: (a) gate_order [input,forget,cell,output] konsisten, " +
        "(b) BOTH Dense layers dijalankan berurutan (hidden ReLU → output linear), " +
        "(c) LSTM activation = tanh, recurrent_activation = sigmoid.",
    );
  }

  // Cek variance error per business_type
  const byType: Record<string, number[]> = {};
  for (const s of samples) {
    byType[s.businessType] ??= [];
    byType[s.businessType].push(s.relError);
  }
  const typeErrors = Object.entries(byType).map(([t, arr]) => ({
    type: t,
    avg: arr.reduce((a, b) => a + b, 0) / arr.length,
    n: arr.length,
  }));
  if (typeErrors.length > 1) {
    const maxT = typeErrors.reduce((a, b) => (a.avg > b.avg ? a : b));
    const minT = typeErrors.reduce((a, b) => (a.avg < b.avg ? a : b));
    if (maxT.avg > minT.avg * 5 && maxT.avg > 0.02) {
      hints.push(
        `→ Error tidak merata per business_type (worst=${maxT.type}: ${(maxT.avg * 100).toFixed(2)}%, ` +
          `best=${minT.type}: ${(minT.avg * 100).toFixed(2)}%). ` +
          "Mungkin business_type_encoded tidak match encoding di training.",
      );
    }
  }

  if (hints.length === 0) {
    hints.push(
      "→ Error kecil tapi di atas threshold. Kemungkinan: floating-point precision " +
        "(Math.tanh vs numpy tanh), atau kernel weights precision loss saat JSON serialization.",
    );
  }
  return hints;
}

interface SampleResult {
  id: number;
  businessType: string;
  keras: number;
  ts: number;
  absError: number;
  relError: number;
}

function main(): void {
  console.log("=".repeat(60));
  console.log(" LSTM TS Inference Parity Test");
  console.log("=".repeat(60));
  console.log(`Model         : ${MODEL_NAME} (${MODEL_VERSION})`);
  console.log(`Sequence len  : ${SEQUENCE_LENGTH}`);
  console.log(`Feature order : ${FEATURE_ORDER.length} fitur`);

  const baseline = loadBaseline();
  console.log(`Baseline      : ${baseline.n_samples} samples (${baseline.model_source})`);

  if (baseline.feature_order.length !== FEATURE_ORDER.length) {
    throw new Error(
      `Baseline feature_order length ${baseline.feature_order.length} != TS ${FEATURE_ORDER.length}`,
    );
  }
  for (let i = 0; i < FEATURE_ORDER.length; i++) {
    if (baseline.feature_order[i] !== FEATURE_ORDER[i]) {
      throw new Error(
        `Feature order mismatch di indeks ${i}: baseline="${baseline.feature_order[i]}" vs ts="${FEATURE_ORDER[i]}"`,
      );
    }
  }

  console.log("");
  console.log(" id | type          | Keras kWh  | TS kWh     |  abs err |  rel err");
  console.log("-".repeat(72));

  const results: SampleResult[] = [];
  for (const sample of baseline.samples) {
    const sequence = sample.raw_sequence.map(toWindow);
    if (sequence.length !== SEQUENCE_LENGTH) {
      throw new Error(
        `Sample ${sample.id}: sequence length ${sequence.length} != ${SEQUENCE_LENGTH}`,
      );
    }
    let tsPred: number;
    try {
      tsPred = predictLstmUmkm(sequence);
    } catch (e) {
      console.error(`  sample ${sample.id} throw: ${(e as Error).message}`);
      throw e;
    }
    const keras = sample.keras_predicted_kwh;
    const absError = tsPred - keras;
    const relError = Math.abs(absError) / Math.max(Math.abs(keras), 1e-9);
    results.push({
      id: sample.id,
      businessType: sample.business_type,
      keras,
      ts: tsPred,
      absError,
      relError,
    });
    console.log(
      ` ${String(sample.id).padStart(2)} | ${sample.business_type.padEnd(13)} | ` +
        `${keras.toFixed(2).padStart(10)} | ${tsPred.toFixed(2).padStart(10)} | ` +
        `${absError.toFixed(3).padStart(8)} | ${(relError * 100).toFixed(3).padStart(6)}%`,
    );
  }

  const absErrors = results.map((r) => Math.abs(r.absError));
  const relErrors = results.map((r) => r.relError);
  const maxAbs = Math.max(...absErrors);
  const avgAbs = absErrors.reduce((a, b) => a + b, 0) / absErrors.length;
  const maxRel = Math.max(...relErrors);
  const avgRel = relErrors.reduce((a, b) => a + b, 0) / relErrors.length;

  console.log("");
  console.log("=".repeat(60));
  console.log(" Summary");
  console.log("=".repeat(60));
  console.log(`  Samples tested        : ${results.length}`);
  console.log(`  Max absolute error    : ${maxAbs.toFixed(4)} kWh`);
  console.log(`  Avg absolute error    : ${avgAbs.toFixed(4)} kWh`);
  console.log(`  Max relative error    : ${(maxRel * 100).toFixed(4)}%`);
  console.log(`  Avg relative error    : ${(avgRel * 100).toFixed(4)}%`);
  console.log(`  Threshold             : ≤ ${(REL_ERROR_THRESHOLD * 100).toFixed(2)}%`);
  console.log("");

  if (maxRel > REL_ERROR_THRESHOLD) {
    console.log("STATUS: [X] FAIL");
    console.log("");
    console.log("Diagnosis kemungkinan penyebab:");
    for (const h of diagnose(maxRel, results)) console.log(`  ${h}`);
    console.log("");
    console.log("LSTM BELUM AMAN untuk diintegrasikan ke src/services/prediction.ts.");
    process.exit(1);
  }

  console.log("STATUS: [OK] PASS");
  console.log("LSTM AMAN untuk diintegrasikan ke src/services/prediction.ts (Fase D).");
}

try {
  main();
} catch (e) {
  console.error("FATAL:", (e as Error).message);
  process.exit(1);
}
