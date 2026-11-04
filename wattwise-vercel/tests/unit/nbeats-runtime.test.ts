import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runEmbeddedNBeatsInference, resetNBeatsSessionForTesting } from '@/lib/ai/embedded-nbeats';

const mock = vi.hoisted(() => ({ run: vi.fn(), create: vi.fn() }));
vi.mock('onnxruntime-web', () => ({
  env: { wasm: {} },
  InferenceSession: { create: mock.create },
  Tensor: class { constructor(public type: string, public data: Float32Array, public dims: number[]) {} },
}));
beforeEach(() => {
  resetNBeatsSessionForTesting();
  mock.create.mockResolvedValue({ run: mock.run });
  vi.stubGlobal('fetch', vi.fn(async () => new Response(readFileSync('public/models/nbeats-ai02-1.0.0.onnx'))));
});
afterEach(() => vi.unstubAllGlobals());

it('sends chronological raw float32 [1,6], accepts scalar float32 [1,1]', async () => {
  mock.run.mockResolvedValue({ prediction_kwh: { type: 'float32', dims: [1, 1], data: new Float32Array([7]) } });
  expect((await runEmbeddedNBeatsInference([1, 2, 3, 4, 5, 6])).predictionKwh).toBe(7);
  expect(mock.run.mock.calls.at(-1)?.[0].history_6m).toMatchObject({ type: 'float32', dims: [1, 6], data: new Float32Array([1, 2, 3, 4, 5, 6]) });
});
it.each([
  undefined,
  { type: 'float32', dims: [1, 2], data: [1, 2] },
  { type: 'int64', dims: [1, 1], data: [1] },
  { type: 'float32', dims: [1, 1], data: [NaN] },
  { type: 'float32', dims: [1, 1], data: [-1] },
])('rejects malformed or invalid output %j', async output => {
  mock.run.mockResolvedValue({ prediction_kwh: output });
  await expect(runEmbeddedNBeatsInference([1, 2, 3, 4, 5, 6])).rejects.toThrow();
});
it('rejects corrupted model bytes before creating a session', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(new Response('corrupted'));
  await expect(runEmbeddedNBeatsInference([1, 2, 3, 4, 5, 6])).rejects.toThrow('MODEL_HASH_MISMATCH');
});
