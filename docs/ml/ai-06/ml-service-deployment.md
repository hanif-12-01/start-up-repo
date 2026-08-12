# AI-06A Private ML Service Deployment Package

The Docker package runs the existing AI-04 isolated worker and AI-05 supervisor as a persistent,
non-root Python service. It exposes `/health/live`, `/health/ready`, authenticated `/v2/forecast`,
and does not include the N-BEATS checkpoint.

The external model directory must be mounted read-only. `ArtifactInventory` validates the
manifest and SHA-256 before creating the model worker. The frozen model identity is
`nbeats-ai02-1.0.0`; `latest` is not accepted. SIGTERM closes the HTTP server and worker.

AI-06A container rehearsal on the current Windows/Docker Desktop host measured: approximately
40 seconds from container creation to READY, warm HTTP p95 292.202 ms across 20 synthetic
requests, and a highest observed container memory reading of 1.422 GiB. The steady reading after
preload was approximately 1.321 GiB. Graceful SIGTERM shutdown completed with exit code 0 in
5,616 ms. The frozen checkpoint is 4,447,799 bytes. These are local observations, not cloud SKU
claims; provision explicit headroom above them. A persistent hosting target is not selected or
purchased in AI-06A.

The Python scientific stack already ships the required OpenMP runtime in Torch's library
directory. `LD_LIBRARY_PATH` is set in the image so LightGBM's import-time native dependency can
resolve without downloading mutable OS packages. Docker Desktop completed the final image as
`fb890396e38a`; a fresh container reached READY with the real read-only artifact and stopped with
exit code 0 without a runtime environment override.
