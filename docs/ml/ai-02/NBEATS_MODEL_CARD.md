# N-BEATS AI-02 Model Card

Status: **NOT APPROVED FOR DIRECT PRODUCTION SERVING**  
Model version: `nbeats-ai02-1.0.0`  
Training run: `ai02-hardened-ai01-seen-seed17`

## Intended use

This artifact prepares one-month-ahead electricity-usage forecasts for offline shadow
validation when a request has at least six contiguous valid monthly kWh observations.
It is decision-support research, not an official PLN measurement or a guaranteed
forecast. AI-02 exposes no production API and performs no database writes.

## Non-intended use

Do not use it for direct production serving, billing, device-level measurement,
failure diagnosis, causal claims, guaranteed savings, histories shorter than six
months, non-contiguous histories, negative/non-finite values, or combined accuracy
claims across measured residential, measured commercial, and simulated domains.

## Training data and AI-01 evidence

The hardened package is a byte-identical versioned copy of the frozen AI-01 champion
checkpoint. Primary evidence is measured BDG2 data, fingerprint
`d21b6d66b96bb30f792226e6ae8f38c182c92918e3558e42ccadd6785e2d7e4b`.
London SmartMeter is secondary robustness evidence; ComStock is auxiliary
`MODELED_SIMULATION`. UCI remains excluded as `DEFERRED_DATASET_AVAILABILITY`.

AI-01 closing SHA: `61969c089fc407ba24aaa88bb85da16a0e091d30`.
AI-01 demonstrated N-BEATS as champion for H06_12 and H13_PLUS. AI-02 did not reopen
model selection, retune hyperparameters, or use frozen test labels for training or
selection.

Frozen evidence fingerprints:

- test observation IDs: `efc507ae9fdaba9f53dd8b91ba5082110b5fc49f3644fe1ef8b84ba116a63845`;
- entity split: `0f64b1006ae9db7db82cf5c46fe615a0ff319c8b855a0062bda68c14e6371ae5`;
- AI-01 feature schema: `5a7f36a8c9096f2025bd1d9357b379c5b9aa719780d49782d8599db6b6a68dc1`.

## Model identity and feature contract

- artifact SHA-256: `541905740b790d39434774679ce3120338ecdabd3f13a8d95385f1d6272191d6`;
- configuration SHA-256: `a7291d66cdc397a61f1dcd8505696b778bafe6d1f2dd87e2d42d2e3c0adb1e32`;
- inference feature-contract SHA-256:
  `0442358152959f5ea3568c4baf846e0df887d14b692ed734600f6fdb60958fd4`;
- seed: `17`;
- context: six monthly observations;
- horizon: one calendar month;
- loss: MAE;
- target normalizer: `EncoderNormalizer(softplus)`.

History must be sorted, unique, calendar-contiguous, finite, nonnegative, and measured
in monthly kWh. Valid zeros remain zeros. Target-month usage and future history cannot
be supplied as input. Training and serving feature builders share the same frozen
feature implementation; executable parity tests cover 1, 3, 6, 12, and 13+ months.

## Failure modes and fallback

N-BEATS is rejected on artifact absence/corruption/checksum mismatch, schema mismatch,
unsupported history, invalid input, non-finite or negative output, invalid shape,
timeout-equivalent failure, or inference exception. The inference boundary returns the
deterministic baseline with an explicit reason. It never silently emits an invalid ML
value.

## Round-trip and reproducibility

The real checkpoint was loaded, predicted, released, reloaded, and predicted again.
Maximum absolute delta was `0.0` at tolerance `1e-6`. Two controlled reload/prediction
runs over eight non-test-label fixtures also produced maximum delta `0.0`, MAE delta
`0.0`, and RMSE delta `0.0`. Binary-byte identity is not generalized as a promise for
future framework serialization.

## Operational measurements

Measurements on the current Windows CPU machine:

- artifact size: 4,447,799 bytes;
- cold load: 5,424.42 ms;
- single warm prediction: p50 88.43 ms, p95 139.69 ms, p99 158.15 ms;
- batch of eight: p50 106.38 ms, p95 126.86 ms, p99 133.73 ms;
- peak total process RSS: 751,607,808 bytes.

RSS includes Python, Torch, Lightning, pandas, and other loaded scientific libraries;
it is not a model-only allocation. Cold-load cost requires preloading for shadow
workers and is tracked as a P2 operational recommendation, not hidden.

## Known limitations and risks

BDG2 is not an Indonesian UMKM dataset. London is residential and ComStock is
simulation, so domain shift remains material. The model needs six contiguous months,
provides a point estimate rather than a guarantee, and has substantially higher startup
and memory overhead than LightGBM. Shadow validation must evaluate real application
traffic before application integration is considered.
