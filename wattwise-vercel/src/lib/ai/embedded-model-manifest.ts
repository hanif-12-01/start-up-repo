export const EMBEDDED_NBEATS_MODEL = {
  modelName: 'nbeats',
  modelVersion: 'nbeats-ai02-1.0.0',
  executionEngine: 'nbeats',
  runtime: 'browser_onnx_wasm',
  publicUrl: '/models/nbeats-ai02-1.0.0.onnx',
  sha256: '33eef1bca1008eb06bd687772c994371b00d443d763a35de51d60e760fe21988',
  inputName: 'history_6m',
  inputShape: [1, 6] as const,
  inputDtype: 'float32',
  outputName: 'prediction_kwh',
  historyLength: 6,
} as const;

export type EmbeddedModelManifest = typeof EMBEDDED_NBEATS_MODEL;
