from __future__ import annotations

import math
import time
from typing import Any, Protocol

from wattwise_benchmark.models.deterministic import deterministic_forecast
from wattwise_benchmark.recovery import predict_loaded_artifact
from wattwise_serving.artifacts import ArtifactError, ArtifactInventory, QualifiedModelLoader
from wattwise_serving.shadow_contracts import ForecastRequest, ForecastResult
from wattwise_serving.shadow_features import build_model_example


class Predictor(Protocol):
    def __call__(self, model_key: str, model: Any, examples: Any) -> Any: ...


class ShadowInferenceRuntime:
    def __init__(
        self,
        inventory: ArtifactInventory,
        *,
        feature_schema_sha256: str,
        loader: Any | None = None,
        predictor: Predictor | None = None,
        timeout_ms: float = 30_000.0,
    ) -> None:
        self.inventory = inventory
        self.feature_schema_sha256 = feature_schema_sha256
        self.loader = loader or QualifiedModelLoader()
        self.predictor = predictor or predict_loaded_artifact
        self.timeout_ms = timeout_ms
        self._models: dict[tuple[str, str], Any] = {}

    def predict(self, request: ForecastRequest) -> ForecastResult:
        started = time.perf_counter()
        history = [point.usage_kwh for point in request.history]
        deterministic = deterministic_forecast(history)
        phase = request.history_phase
        route = request.selected_route
        if route == "deterministic_baseline":
            reason = "FALLBACK_INSUFFICIENT_HISTORY" if len(history) < 6 else None
            return self._result(
                request,
                phase=phase,
                prediction=deterministic,
                selected_model="deterministic_baseline",
                model_version="deterministic-baseline-v1",
                fallback_used=reason is not None,
                fallback_reason=reason,
                deterministic=deterministic,
                outcome="FALLBACK_INSUFFICIENT_HISTORY" if reason else "ML_SUCCESS",
                artifact_version="none",
                started=started,
            )
        if request.feature_schema_sha256 != self.feature_schema_sha256:
            return self._fallback(
                request,
                phase,
                deterministic,
                "FALLBACK_SCHEMA_MISMATCH",
                started,
            )
        try:
            spec = self.inventory.require("nbeats", self.inventory.specs["nbeats"].version)
            cache_key = (spec.model_key, spec.sha256)
            model = self._models.get(cache_key)
            if model is None:
                model = self.loader.load(spec)
                self._models[cache_key] = model
            example = build_model_example(request)
            predictions = self.predictor("nbeats", model, example)
            if len(predictions) != 1:
                raise ArtifactError("INVALID_PREDICTION_SHAPE")
            prediction = float(predictions.iloc[0]["prediction_kwh"])
            elapsed_ms = (time.perf_counter() - started) * 1000.0
            if elapsed_ms > self.timeout_ms:
                raise TimeoutError("inference deadline exceeded")
            if not math.isfinite(prediction) or prediction < 0:
                return self._fallback(
                    request,
                    phase,
                    deterministic,
                    "FALLBACK_INVALID_OUTPUT",
                    started,
                )
            return self._result(
                request,
                phase=phase,
                prediction=prediction,
                selected_model="nbeats",
                model_version=spec.version,
                fallback_used=False,
                fallback_reason=None,
                deterministic=deterministic,
                outcome="ML_SUCCESS",
                artifact_version=spec.version,
                started=started,
            )
        except TimeoutError:
            return self._fallback(
                request,
                phase,
                deterministic,
                "FALLBACK_INFERENCE_FAILURE",
                started,
            )
        except (ArtifactError, KeyError, OSError):
            return self._fallback(
                request,
                phase,
                deterministic,
                "FALLBACK_ARTIFACT_UNAVAILABLE",
                started,
            )
        except Exception:
            return self._fallback(
                request,
                phase,
                deterministic,
                "FALLBACK_INFERENCE_FAILURE",
                started,
            )

    def predict_payload(self, payload: Any) -> ForecastResult:
        started = time.perf_counter()
        try:
            request = ForecastRequest.from_dict(payload)
        except Exception:
            request_id = (
                payload.get("request_id", "invalid-request")
                if isinstance(payload, dict)
                else "invalid-request"
            )
            forecast_timestamp = (
                str(payload.get("forecast_timestamp", ""))
                if isinstance(payload, dict)
                else ""
            )
            return ForecastResult(
                request_id=str(request_id),
                forecast_timestamp=forecast_timestamp,
                history_phase="UNKNOWN",
                prediction_kwh=None,
                selected_model="deterministic_baseline",
                model_version="deterministic-baseline-v1",
                fallback_used=True,
                fallback_reason="FALLBACK_INVALID_INPUT",
                inference_latency_ms=self._latency(started),
                artifact_version="none",
                deterministic_prediction_kwh=None,
                outcome="FALLBACK_INVALID_INPUT",
            )
        return self.predict(request)

    def _fallback(
        self,
        request: ForecastRequest,
        phase: str,
        deterministic: float | None,
        reason: str,
        started: float,
    ) -> ForecastResult:
        return self._result(
            request,
            phase=phase,
            prediction=deterministic,
            selected_model="deterministic_baseline",
            model_version="deterministic-baseline-v1",
            fallback_used=True,
            fallback_reason=reason,
            deterministic=deterministic,
            outcome=reason,
            artifact_version="none",
            started=started,
        )

    @staticmethod
    def _latency(started: float) -> float:
        return max(0.0, (time.perf_counter() - started) * 1000.0)

    def _result(
        self,
        request: ForecastRequest,
        *,
        phase: str,
        prediction: float | None,
        selected_model: str,
        model_version: str,
        fallback_used: bool,
        fallback_reason: str | None,
        deterministic: float | None,
        outcome: str,
        artifact_version: str,
        started: float,
    ) -> ForecastResult:
        return ForecastResult(
            request_id=request.request_id,
            forecast_timestamp=request.forecast_timestamp,
            history_phase=phase,
            prediction_kwh=prediction,
            selected_model=selected_model,
            model_version=model_version,
            fallback_used=fallback_used,
            fallback_reason=fallback_reason,
            inference_latency_ms=self._latency(started),
            artifact_version=artifact_version,
            deterministic_prediction_kwh=deterministic,
            outcome=outcome,
        )
