import "server-only";
// Bobot LSTM di-load compile-time dari JSON hasil export offline (Skrip 18).
// Kalau Next.js menolak import di luar src/, alternatif: copy file JSON ke
// src/lib/prediction/ atau generate file .ts inline dari export.
import LSTM_DATA_RAW from "../../../ML/outputs_lstm/lstm_model_export.json";

/**
 * WattWise LSTM Prototype — inferensi pure TypeScript.
 *
 * SUMBER BOBOT: ML/outputs_lstm/lstm_model_export.json (dari Skrip 18).
 *
 * Arsitektur asli (Keras):
 *   Input(6 timesteps × 10 fitur)
 *     → LSTM(32, tanh, recurrent_sigmoid)
 *     → Dropout(0.2)   ← dilewati pada inferensi (identitas)
 *     → Dense(16, ReLU)
 *     → Dense(1, linear)
 *
 * Forward-pass di file ini melalui **kedua** Dense secara berurutan
 * (bukan hanya `dense` output alias). `dense_layers[]` mempertahankan
 * urutan Keras persis: hidden → output.
 *
 * Nol dependency runtime ML: tidak menyentuh package.json (TensorFlow.js,
 * ONNX, keras-node — semua tidak dipakai). Sama pola dengan Ridge UMKM v1.1.
 */

// ─────────────────────────────────────────────────────────────
// Typing untuk JSON export
// ─────────────────────────────────────────────────────────────

interface LstmLayerBundle {
  units: number;
  activation: string;
  kernel: number[][];
  bias: number[];
  name: string;
}

interface LstmExport {
  model_name: string;
  model_version: string;
  sequence_length: number;
  feature_order: string[];
  target_name: string;
  business_type_encoding: Record<string, number>;
  input_scaler: { mean: number[]; scale: number[] };
  target_scaler: { mean: number[]; scale: number[] };
  layers: {
    lstm: {
      units: number;
      activation: string;
      recurrent_activation: string;
      gate_order: string[];
      kernel: number[][];
      recurrent_kernel: number[][];
      bias: number[];
    };
    dense: LstmLayerBundle;
    dense_layers: LstmLayerBundle[];
  };
  disclaimer: string;
}

const LSTM_DATA = LSTM_DATA_RAW as unknown as LstmExport;

// ─────────────────────────────────────────────────────────────
// Public constants & types
// ─────────────────────────────────────────────────────────────

export const MODEL_NAME = LSTM_DATA.model_name;
export const MODEL_VERSION = LSTM_DATA.model_version;
export const DISCLAIMER = LSTM_DATA.disclaimer;
export const SEQUENCE_LENGTH = LSTM_DATA.sequence_length;

/**
 * Urutan fitur di-hardcode sebagai tuple `as const` supaya TypeScript bisa
 * memberi type union `LstmFeatureName`. Sanity-check runtime memverifikasi
 * bahwa `feature_order` di JSON persis sama — kalau JSON di-regen dengan
 * urutan berbeda, module lempar error di initial load, bukan silently
 * memprediksi angka salah.
 */
export const FEATURE_ORDER = [
  "latest_usage_kwh",
  "previous_usage_kwh",
  "avg_3_month_usage_kwh",
  "avg_6_month_usage_kwh",
  "trend_1_month",
  "trend_3_month",
  "month_sin",
  "month_cos",
  "business_type_encoded",
  "avg_tariff_idr_per_kwh",
] as const;

export type LstmFeatureName = (typeof FEATURE_ORDER)[number];
export type LstmFeatureWindow = Record<LstmFeatureName, number>;

// ─────────────────────────────────────────────────────────────
// Module-init sanity checks (fail fast, bukan predict garbage)
// ─────────────────────────────────────────────────────────────

if (LSTM_DATA.feature_order.length !== FEATURE_ORDER.length) {
  throw new Error(
    `LSTM init: feature_order JSON (${LSTM_DATA.feature_order.length}) != TS const (${FEATURE_ORDER.length})`,
  );
}
for (let i = 0; i < FEATURE_ORDER.length; i++) {
  if (LSTM_DATA.feature_order[i] !== FEATURE_ORDER[i]) {
    throw new Error(
      `LSTM init: feature_order mismatch di indeks ${i}: JSON="${LSTM_DATA.feature_order[i]}" != TS="${FEATURE_ORDER[i]}"`,
    );
  }
}
if (LSTM_DATA.layers.lstm.activation !== "tanh") {
  throw new Error(`LSTM init: activation harus tanh, dapat "${LSTM_DATA.layers.lstm.activation}"`);
}
if (LSTM_DATA.layers.lstm.recurrent_activation !== "sigmoid") {
  throw new Error(
    `LSTM init: recurrent_activation harus sigmoid, dapat "${LSTM_DATA.layers.lstm.recurrent_activation}"`,
  );
}
{
  const g = LSTM_DATA.layers.lstm.gate_order;
  const expected = ["input", "forget", "cell", "output"];
  if (g.length !== 4 || g.some((v, i) => v !== expected[i])) {
    throw new Error(`LSTM init: gate_order harus [input,forget,cell,output], dapat [${g.join(",")}]`);
  }
}

// ─────────────────────────────────────────────────────────────
// Numeric helpers
// ─────────────────────────────────────────────────────────────

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function relu(x: number): number {
  return x > 0 ? x : 0;
}

/** dot product dua vektor dengan panjang sama. */
function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/**
 * Perkalian vec (baris) × matrix (row-major).
 * matrix shape: [rows, cols], vec shape: [rows]. Hasil: [cols].
 * Konvensi ini cocok dengan Keras yang menyimpan kernel `[input_dim, output_dim]`.
 */
function matVec(matrix: number[][], vec: number[]): number[] {
  const cols = matrix[0].length;
  const rows = matrix.length;
  const out = new Array<number>(cols).fill(0);
  for (let j = 0; j < cols; j++) {
    let s = 0;
    for (let i = 0; i < rows; i++) s += matrix[i][j] * vec[i];
    out[j] = s;
  }
  return out;
}

function addVectors(a: number[], b: number[]): number[] {
  const out = new Array<number>(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] + b[i];
  return out;
}

function multiplyVectors(a: number[], b: number[]): number[] {
  const out = new Array<number>(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] * b[i];
  return out;
}

function applyActivation(v: number[], activation: string): number[] {
  switch (activation) {
    case "relu":
      return v.map(relu);
    case "tanh":
      return v.map(Math.tanh);
    case "sigmoid":
      return v.map(sigmoid);
    case "linear":
      return v;
    default:
      throw new Error(`LSTM: aktivasi Dense tidak didukung: "${activation}"`);
  }
}

// ─────────────────────────────────────────────────────────────
// Preprocessing
// ─────────────────────────────────────────────────────────────

function validateSequence(sequence: LstmFeatureWindow[]): number[][] {
  if (sequence.length !== SEQUENCE_LENGTH) {
    throw new Error(
      `LSTM: butuh tepat ${SEQUENCE_LENGTH} timestep, dapat ${sequence.length}.`,
    );
  }
  const out: number[][] = [];
  for (let t = 0; t < sequence.length; t++) {
    const step = sequence[t];
    const row = new Array<number>(FEATURE_ORDER.length);
    for (let i = 0; i < FEATURE_ORDER.length; i++) {
      const feat = FEATURE_ORDER[i];
      const v = step[feat];
      if (typeof v !== "number" || !Number.isFinite(v)) {
        throw new Error(
          `LSTM: nilai fitur "${feat}" pada timestep ${t} harus number berhingga, dapat ${v}`,
        );
      }
      row[i] = v;
    }
    out.push(row);
  }
  return out;
}

function scaleSequence(raw: number[][]): number[][] {
  const { mean, scale } = LSTM_DATA.input_scaler;
  const n = FEATURE_ORDER.length;
  if (mean.length !== n || scale.length !== n) {
    throw new Error(
      `LSTM: input_scaler dimensi tidak cocok — mean=${mean.length}, scale=${scale.length}, expected=${n}`,
    );
  }
  return raw.map((step) =>
    step.map((x, i) => (x - mean[i]) / (scale[i] === 0 ? 1 : scale[i])),
  );
}

// ─────────────────────────────────────────────────────────────
// LSTM forward-pass (Keras standar)
// ─────────────────────────────────────────────────────────────

function runLstm(scaledSequence: number[][]): number[] {
  const { units, kernel, recurrent_kernel, bias } = LSTM_DATA.layers.lstm;
  const gateSize = units;
  const n = FEATURE_ORDER.length;

  // Shape sanity — sudah divalidasi di export, ini pertahanan runtime.
  if (kernel.length !== n || kernel[0].length !== 4 * units) {
    throw new Error(
      `LSTM: kernel shape [${kernel.length},${kernel[0].length}] != [${n},${4 * units}]`,
    );
  }
  if (recurrent_kernel.length !== units || recurrent_kernel[0].length !== 4 * units) {
    throw new Error(
      `LSTM: recurrent_kernel shape mismatch (expected [${units},${4 * units}])`,
    );
  }
  if (bias.length !== 4 * units) {
    throw new Error(`LSTM: bias length ${bias.length} != 4*units ${4 * units}`);
  }

  let h: number[] = new Array<number>(units).fill(0);
  let c: number[] = new Array<number>(units).fill(0);

  for (let t = 0; t < scaledSequence.length; t++) {
    const x = scaledSequence[t];

    // z = x·W + h·U + b  →  panjang 4*units
    const xW = matVec(kernel, x);
    const hU = matVec(recurrent_kernel, h);
    const z = addVectors(addVectors(xW, hU), bias);

    // Split sesuai gate_order [input, forget, cell, output] — sudah divalidasi.
    const zI = z.slice(0, gateSize);
    const zF = z.slice(gateSize, 2 * gateSize);
    const zC = z.slice(2 * gateSize, 3 * gateSize);
    const zO = z.slice(3 * gateSize, 4 * gateSize);

    // recurrent_activation = sigmoid utk gate; activation = tanh utk cell candidate.
    const iGate = zI.map(sigmoid);
    const fGate = zF.map(sigmoid);
    const gCand = zC.map(Math.tanh);
    const oGate = zO.map(sigmoid);

    // c_t = f * c_prev + i * g
    const nextC = addVectors(multiplyVectors(fGate, c), multiplyVectors(iGate, gCand));
    // h_t = o * tanh(c_t)
    const nextH = multiplyVectors(oGate, nextC.map(Math.tanh));

    c = nextC;
    h = nextH;
  }

  return h; // final hidden state
}

// ─────────────────────────────────────────────────────────────
// Dense stack — WAJIB iterate `dense_layers` (hidden + output),
// bukan hanya `dense` alias.
// ─────────────────────────────────────────────────────────────

function runDenseLayers(hFinal: number[]): number[] {
  // Dropout tidak masuk `dense_layers` (Skrip 18 filter out layer non-inference).
  let x = hFinal;
  for (const layer of LSTM_DATA.layers.dense_layers) {
    if (layer.kernel.length !== x.length) {
      throw new Error(
        `Dense[${layer.name}]: input dim ${x.length} != kernel rows ${layer.kernel.length}`,
      );
    }
    const z = addVectors(matVec(layer.kernel, x), layer.bias);
    x = applyActivation(z, layer.activation);
  }
  return x;
}

function inverseScaleTarget(yScaled: number): number {
  const { mean, scale } = LSTM_DATA.target_scaler;
  if (mean.length !== 1 || scale.length !== 1) {
    throw new Error(
      `LSTM: target_scaler harus dimensi 1 (mean=${mean.length}, scale=${scale.length})`,
    );
  }
  return yScaled * scale[0] + mean[0];
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Inferensi LSTM UMKM v0.1 → return prediksi pemakaian listrik bulan depan
 * dalam kWh (skala aktual, sudah inverse-transformed).
 *
 * Melempar error kalau:
 *  - `sequence.length !== 6`
 *  - salah satu fitur bukan number berhingga
 *  - output non-finite, NaN, atau ≤ 0
 *
 * Semua guard di atas mencegah "silent bad prediction" — service layer di
 * atas (`src/services/prediction.ts`) tinggal wrap try/catch untuk jatuh ke
 * fallback rule-based (belum di-wire di task ini).
 */
export function predictLstmUmkm(sequence: LstmFeatureWindow[]): number {
  const raw = validateSequence(sequence);
  const scaled = scaleSequence(raw);
  const hFinal = runLstm(scaled);
  const denseOut = runDenseLayers(hFinal);

  if (denseOut.length !== 1) {
    throw new Error(`LSTM: expected 1 output dari Dense output, dapat ${denseOut.length}`);
  }

  const yFinal = inverseScaleTarget(denseOut[0]);

  if (!Number.isFinite(yFinal)) {
    throw new Error(`LSTM: output non-finite (${yFinal})`);
  }
  if (yFinal <= 0) {
    throw new Error(
      `LSTM: output non-positif (${yFinal.toFixed(2)} kWh) — tidak masuk akal.`,
    );
  }
  return yFinal;
}

// Ekspor helper `dot` supaya lint tidak "unused" — juga berguna untuk tests.
export const _internal = {
  sigmoid,
  relu,
  tanh: Math.tanh,
  dot,
  matVec,
  addVectors,
  multiplyVectors,
  applyActivation,
};
