import type { InferenceSession } from 'onnxruntime-web';
import { EMBEDDED_NBEATS_MODEL } from './embedded-model-manifest';

let sessionPromise: Promise<InferenceSession> | null = null;

async function bufferToSha256Hex(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function getOrCreateNBeatsSession(): Promise<InferenceSession> {
  if (sessionPromise) {
    return sessionPromise;
  }

  sessionPromise = (async () => {
    // 1. Dynamic import of onnxruntime-web
    const ort = await import('onnxruntime-web');

    // 2. Configure same-origin WASM paths
    ort.env.wasm.wasmPaths = '/ort-wasm/';
    ort.env.wasm.numThreads = 1;

    // 3. Fetch model as ArrayBuffer
    const response = await fetch(EMBEDDED_NBEATS_MODEL.publicUrl);
    if (!response.ok) {
      throw new Error(`MODEL_FETCH_FAILED: HTTP ${response.status}`);
    }
    const modelBuffer = await response.arrayBuffer();

    // 4. Verify SHA-256 hash
    const computedHash = await bufferToSha256Hex(modelBuffer);
    if (computedHash.toLowerCase() !== EMBEDDED_NBEATS_MODEL.sha256.toLowerCase()) {
      throw new Error(`MODEL_HASH_MISMATCH: expected ${EMBEDDED_NBEATS_MODEL.sha256}, got ${computedHash}`);
    }

    // 5. Create InferenceSession from verified buffer
    const session = await ort.InferenceSession.create(modelBuffer, {
      executionProviders: ['wasm'],
    });

    return session;
  })();

  // Clear cache if initialization fails so next call can retry cleanly
  sessionPromise.catch(() => {
    sessionPromise = null;
  });

  return sessionPromise;
}

export interface NBeatsInferenceResult {
  predictionKwh: number;
  latencyMs: number;
  modelVersion: string;
  runtime: 'browser_onnx_wasm';
}

export async function runEmbeddedNBeatsInference(
  history6m: number[] | Float32Array
): Promise<NBeatsInferenceResult> {
  if (!history6m || history6m.length !== 6) {
    throw new Error(`INVALID_INPUT_LENGTH: expected 6 historical values, got ${history6m?.length ?? 0}`);
  }

  for (let i = 0; i < 6; i++) {
    const val = history6m[i];
    if (val === null || val === undefined || !Number.isFinite(val) || val < 0) {
      throw new Error(`INVALID_INPUT_VALUE: value at index ${i} is not a valid non-negative number (${val})`);
    }
  }

  const ort = await import('onnxruntime-web');
  const session = await getOrCreateNBeatsSession();

  const tensorData = new Float32Array(history6m);
  const inputTensor = new ort.Tensor('float32', tensorData, [1, 6]);

  const start = performance.now();
  const feeds = { [EMBEDDED_NBEATS_MODEL.inputName]: inputTensor };
  const results = await session.run(feeds);
  const durationMs = performance.now() - start;

  const outputTensor = results[EMBEDDED_NBEATS_MODEL.outputName];
  if (!outputTensor || !outputTensor.data || outputTensor.data.length === 0) {
    throw new Error('MISSING_OUTPUT_TENSOR: prediction_kwh not returned');
  }

  const rawPrediction = Number(outputTensor.data[0]);
  if (!Number.isFinite(rawPrediction)) {
    throw new Error(`NON_FINITE_PREDICTION: model returned ${rawPrediction}`);
  }
  if (rawPrediction < 0) {
    throw new Error(`NEGATIVE_PREDICTION: model returned ${rawPrediction}`);
  }

  return {
    predictionKwh: rawPrediction,
    latencyMs: Math.round(durationMs * 100) / 100,
    modelVersion: EMBEDDED_NBEATS_MODEL.modelVersion,
    runtime: 'browser_onnx_wasm',
  };
}

export function resetNBeatsSessionForTesting(): void {
  sessionPromise = null;
}
