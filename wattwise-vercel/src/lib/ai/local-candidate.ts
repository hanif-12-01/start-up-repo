import { EMBEDDED_NBEATS_MODEL } from './embedded-model-manifest';

export const LOCAL_NBEATS_CANDIDATE = {
  ...EMBEDDED_NBEATS_MODEL,
  modelVersion: 'nbeats-ai02-1.0.1-softplus-candidate',
  publicUrl: '/api/internal/nbeats-candidate',
  sha256: '4703d90da79b9a33c191bc4162916e3ca1db89f62670ad64be1c5df4fe8e7568',
} as const;

export type NBeatsSelection = 'original' | 'local-candidate';
