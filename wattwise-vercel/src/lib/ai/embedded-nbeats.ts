import type { InferenceSession } from 'onnxruntime-web';
import { EMBEDDED_NBEATS_MODEL } from './embedded-model-manifest';
import { LOCAL_NBEATS_CANDIDATE, type NBeatsSelection } from './local-candidate';

const sessions = new Map<NBeatsSelection, Promise<InferenceSession>>();

function selectedModel(selection: NBeatsSelection) {
  if (selection === 'original') return EMBEDDED_NBEATS_MODEL;
  if (selection === 'local-candidate') return LOCAL_NBEATS_CANDIDATE;
  throw new Error('INVALID_MODEL_SELECTION');
}

async function bufferToSha256Hex(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function getOrCreateNBeatsSession(selection: NBeatsSelection = 'original'): Promise<InferenceSession> {
  const model = selectedModel(selection);
  const cached = sessions.get(selection);
  if (cached) return cached;

  const sessionPromise = (async () => {
    // 1. Dynamic import of onnxruntime-web
    const ort = await import('onnxruntime-web');

    // 2. Configure same-origin WASM paths
    ort.env.wasm.wasmPaths = '/ort-wasm/';
    ort.env.wasm.numThreads = 1;

    // 3. Fetch model as ArrayBuffer
    const response = await fetch(model.publicUrl, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`MODEL_FETCH_FAILED: HTTP ${response.status}`);
    }
    const modelBuffer = await response.arrayBuffer();

    // 4. Verify SHA-256 hash
    const computedHash = await bufferToSha256Hex(modelBuffer);
    if (computedHash.toLowerCase() !== model.sha256.toLowerCase()) {
      throw new Error(`MODEL_HASH_MISMATCH: expected ${model.sha256}, got ${computedHash}`);
    }

    // 5. Create InferenceSession from verified buffer
    const session = await ort.InferenceSession.create(modelBuffer, {
      executionProviders: ['wasm'],
    });

    return session;
  })();

  sessions.set(selection, sessionPromise);
  // Clear only the failed model so a retry cannot mix original/candidate sessions.
  sessionPromise.catch(() => {
    if (sessions.get(selection) === sessionPromise) sessions.delete(selection);
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
  history6m: number[] | Float32Array,
  selection: NBeatsSelection = 'original',
): Promise<NBeatsInferenceResult> {
  if (!history6m || history6m.length !== 6) {
    throw new Error(`INVALID_INPUT_LENGTH: expected 6 historical values, got ${history6m?.length ?? 0}`);
  }

  for (let i = 0; i < 6; i++) {
    const val = history6m[i];
    if (typeof val !== 'number' || !Number.isFinite(Math.fround(val)) || val < 0) {
      throw new Error(`INVALID_INPUT_VALUE: value at index ${i} is not a valid non-negative number (${val})`);
    }
  }

  const model = selectedModel(selection);
  const ort = await import('onnxruntime-web');
  const session = await getOrCreateNBeatsSession(selection);

  const tensorData = new Float32Array(history6m);
  const inputTensor = new ort.Tensor('float32', tensorData, [1, 6]);

  const start = performance.now();
  const feeds = { [model.inputName]: inputTensor };
  const results = await session.run(feeds);
  const durationMs = performance.now() - start;

  const outputTensor = results[model.outputName];
  if (!outputTensor || outputTensor.type !== 'float32' || outputTensor.dims.length !== 2 || outputTensor.dims[0] !== 1 || outputTensor.dims[1] !== 1 || outputTensor.data.length !== 1) {
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
    modelVersion: model.modelVersion,
    runtime: 'browser_onnx_wasm',
  };
}

export function resetNBeatsSessionForTesting(): void {
  sessions.clear();
}
