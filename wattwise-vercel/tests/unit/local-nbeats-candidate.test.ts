import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { EMBEDDED_NBEATS_MODEL } from '@/lib/ai/embedded-model-manifest';
import { LOCAL_NBEATS_CANDIDATE } from '@/lib/ai/local-candidate';
import { isLocalNBeatsCandidateAllowed } from '@/server/services/local-nbeats-candidate';
import { getOrCreateNBeatsSession, resetNBeatsSessionForTesting, runEmbeddedNBeatsInference } from '@/lib/ai/embedded-nbeats';
import { GET } from '@/app/api/internal/nbeats-candidate/route';

const mocks = vi.hoisted(() => ({
  create: vi.fn(), run: vi.fn(), read: vi.fn(), session: vi.fn(),
}));
vi.mock('onnxruntime-web', () => ({
  env: { wasm: {} },
  Tensor: class { constructor(public type: string, public data: Float32Array, public dims: number[]) {} },
  InferenceSession: { create: mocks.create },
}));
vi.mock('node:fs/promises', () => ({ readFile: mocks.read }));
vi.mock('@/server/auth/session', () => ({ getOptionalSession: mocks.session }));

const config = { NODE_ENV: 'test', WATTWISE_LOCAL_NBEATS_CANDIDATE: 'true' };
const output = (data = new Float32Array([4.6241975]), dims = [1, 1], type = 'float32') => ({ prediction_kwh: { data, dims, type } });
const request = () => new Request('http://127.0.0.1:3122/api/internal/nbeats-candidate', { headers: { host: '127.0.0.1:3122' } });
function allowRoute() {
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('WATTWISE_LOCAL_NBEATS_CANDIDATE', 'true');
  for (const key of ['VERCEL', 'VERCEL_ENV', 'VERCEL_TARGET_ENV', 'VERCEL_URL']) vi.stubEnv(key, '');
  mocks.session.mockResolvedValue({ user: { id: 'local-user' } });
}
afterEach(() => {
  resetNBeatsSessionForTesting();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

describe('explicit local-only candidate boundary', () => {
  it('pins distinct metadata without changing the default', () => {
    expect(LOCAL_NBEATS_CANDIDATE.modelVersion).toBe('nbeats-ai02-1.0.1-softplus-candidate');
    expect(LOCAL_NBEATS_CANDIDATE.sha256).toBe('4703d90da79b9a33c191bc4162916e3ca1db89f62670ad64be1c5df4fe8e7568');
    expect(EMBEDDED_NBEATS_MODEL.modelVersion).toBe('nbeats-ai02-1.0.0');
    expect(LOCAL_NBEATS_CANDIDATE.publicUrl).not.toMatch(/^\/models/);
  });
  it.each(['localhost', '127.0.0.1:3122', '[::1]:3122'])('allows explicit test runtime at %s', host => {
    expect(isLocalNBeatsCandidateAllowed(host, config)).toBe(true);
  });
  it.each([
    {}, { NODE_ENV: 'production' }, { NODE_ENV: 'development' },
    { WATTWISE_LOCAL_NBEATS_CANDIDATE: '' }, { VERCEL: '1' },
    { VERCEL_ENV: 'preview' }, { VERCEL_ENV: 'production' },
    { VERCEL_TARGET_ENV: 'preview' }, { VERCEL_URL: 'test.vercel.app' },
  ])('denies missing opt-in or deployment identities %j', override => {
    const input = Object.keys(override).length ? { ...config, ...override } : {};
    expect(isLocalNBeatsCandidateAllowed('localhost:3122', input)).toBe(false);
  });
  it.each([null, 'test.vercel.app', 'localhost.evil.test', '192.168.1.2', 'localhost:3122@evil.test'])('denies nonlocal host %s', host => {
    expect(isLocalNBeatsCandidateAllowed(host, config)).toBe(false);
  });
  it('returns 404 before auth/file access when disabled', async () => {
    vi.stubEnv('WATTWISE_LOCAL_NBEATS_CANDIDATE', '');
    expect((await GET(request())).status).toBe(404);
    expect(mocks.session).not.toHaveBeenCalled();
    expect(mocks.read).not.toHaveBeenCalled();
  });
  it('requires authentication before file access', async () => {
    allowRoute();
    mocks.session.mockResolvedValue(null);
    expect((await GET(request())).status).toBe(401);
    expect(mocks.read).not.toHaveBeenCalled();
  });
  it('fails closed on missing/corrupted artifact without disclosing a path', async () => {
    allowRoute();
    mocks.read.mockResolvedValue(Buffer.from('corrupt'));
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.text()).toBe('');
    mocks.read.mockRejectedValue(new Error('missing'));
    expect((await GET(request())).status).toBe(503);
  });
});

describe('verified loader identity/cache/validation', () => {
  function mockRuntime() {
    mocks.create.mockResolvedValue({ run: mocks.run });
    mocks.run.mockResolvedValue(output());
    const original = readFileSync('public/models/nbeats-ai02-1.0.0.onnx');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(original)));
  }
  it('keeps original as default, candidate hash failure cannot reuse its session', async () => {
    mockRuntime();
    const result = await runEmbeddedNBeatsInference([0, 1, 2, 3, 4, 5]);
    expect(result.modelVersion).toBe(EMBEDDED_NBEATS_MODEL.modelVersion);
    await expect(getOrCreateNBeatsSession('local-candidate')).rejects.toThrow('MODEL_HASH_MISMATCH');
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenNthCalledWith(2, LOCAL_NBEATS_CANDIDATE.publicUrl, { cache: 'no-store' });
    await getOrCreateNBeatsSession('local-candidate').catch(() => {});
    expect(fetch).toHaveBeenCalledTimes(3);
    await getOrCreateNBeatsSession();
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(createHash('sha256').update(readFileSync('public/models/nbeats-ai02-1.0.0.onnx')).digest('hex')).toBe(EMBEDDED_NBEATS_MODEL.sha256);
  });
  it('rejects a failed fetch before creating a session', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
    await expect(getOrCreateNBeatsSession('local-candidate')).rejects.toThrow('MODEL_FETCH_FAILED');
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it.each([NaN, Infinity, -1, Number.MAX_VALUE, '1', null])('rejects invalid input %s before fetching', async value => {
    vi.stubGlobal('fetch', vi.fn());
    await expect(runEmbeddedNBeatsInference([1, 2, 3, 4, 5, value] as number[], 'local-candidate')).rejects.toThrow('INVALID_INPUT_VALUE');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('rejects incomplete history before fetching', async () => {
    vi.stubGlobal('fetch', vi.fn());
    await expect(runEmbeddedNBeatsInference([1, 2, 3, 4, 5], 'local-candidate')).rejects.toThrow('INVALID_INPUT_LENGTH');
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    [new Float32Array([NaN]), [1, 1], 'float32', 'NON_FINITE_PREDICTION'],
    [new Float32Array([-1]), [1, 1], 'float32', 'NEGATIVE_PREDICTION'],
    [new Float32Array([1]), [1], 'float32', 'MISSING_OUTPUT_TENSOR'],
    [new Float32Array([1, 2]), [1, 1], 'float32', 'MISSING_OUTPUT_TENSOR'],
    [new Float32Array([1]), [1, 1], 'float64', 'MISSING_OUTPUT_TENSOR'],
  ] as const)('rejects invalid output %#', async (data, dims, type, error) => {
    mockRuntime();
    mocks.run.mockResolvedValue(output(data, [...dims], type));
    await expect(runEmbeddedNBeatsInference([0, 1, 2, 3, 4, 5])).rejects.toThrow(error);
  });
});
