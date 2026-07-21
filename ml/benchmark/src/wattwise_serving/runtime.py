from __future__ import annotations

import math
import time
from typing import Any

from wattwise_benchmark.features.build import build_inference_example
from wattwise_benchmark.recovery import predict_loaded_artifact
from wattwise_serving.artifacts import (
    ArtifactError,
    ArtifactInventory,
    ArtifactLoader,
    QualifiedModelLoader,
)
from wattwise_serving.contracts import PredictionRequest, response


class InferenceRuntime:
    def __init__(
        self,
        inventory: ArtifactInventory,
        loader: ArtifactLoader | None = None,
    ) -> None:
        self.inventory = inventory
        self.loader = loader or QualifiedModelLoader()
        self._models: dict[tuple[str, str], Any] = {}

    def predict(self, request: PredictionRequest) -> dict[str, Any]:
        started = time.perf_counter()
        if request.requested_model == "deterministic_baseline":
            return response(
                request,
                status="NOT_ELIGIBLE",
                prediction_kwh=None,
                eligibility_status="NOT_ELIGIBLE",
                fallback_reason="DETERMINISTIC_HANDLED_BY_APPLICATION",
                latency_ms=self._latency(started),
                artifact_identifier=None,
                artifact_sha256=None,
                error_code=None,
            )

        if request.reporting_phase == "H00" and not self._h00_eligible(request):
            return response(
                request,
                status="NOT_ELIGIBLE",
                prediction_kwh=None,
                eligibility_status="NOT_ELIGIBLE",
                fallback_reason="MISSING_VALIDATED_STATIC_PROFILE",
                latency_ms=self._latency(started),
                artifact_identifier=None,
                artifact_sha256=None,
                error_code=None,
            )

        try:
            spec = self.inventory.require(request.requested_model, request.model_version)
            cache_key = (spec.model_key, spec.sha256)
            model = self._models.get(cache_key)
            if model is None:
                model = self.loader.load(spec)
                self._models[cache_key] = model
            example = build_inference_example(
                entity_id=request.entity_id,
                target_period=request.target_period,
                history=[point.usage_kwh for point in request.consumption_history],
                contextual_features=request.contextual_features,
            )
            predictions = predict_loaded_artifact(spec.model_key, model, example)
            if len(predictions) != 1:
                raise ArtifactError("INVALID_PREDICTION_SHAPE")
            prediction = float(predictions.iloc[0]["prediction_kwh"])
            if not math.isfinite(prediction) or prediction < 0:
                raise ArtifactError("NON_FINITE_OUTPUT")
            return response(
                request,
                status="SUCCESS",
                prediction_kwh=prediction,
                eligibility_status="ELIGIBLE",
                fallback_reason=None,
                latency_ms=self._latency(started),
                artifact_identifier=spec.identifier,
                artifact_sha256=spec.sha256,
            )
        except ArtifactError as exc:
            return response(
                request,
                status="ERROR",
                prediction_kwh=None,
                eligibility_status="ELIGIBLE",
                fallback_reason="ML_UNAVAILABLE",
                latency_ms=self._latency(started),
                artifact_identifier=None,
                artifact_sha256=None,
                error_code=exc.code,
            )
        except Exception:
            return response(
                request,
                status="ERROR",
                prediction_kwh=None,
                eligibility_status="ELIGIBLE",
                fallback_reason="ML_UNAVAILABLE",
                latency_ms=self._latency(started),
                artifact_identifier=None,
                artifact_sha256=None,
                error_code="INFERENCE_FAILED",
            )

    @staticmethod
    def _h00_eligible(request: PredictionRequest) -> bool:
        context = request.contextual_features
        return bool(
            context["profile_eligible"]
            and context["dataset_source"] == "bdg2"
            and context["building_primary_use"]
            and context["site"]
            and context["timezone"]
        )

    @staticmethod
    def _latency(started: float) -> float:
        return max(0.0, (time.perf_counter() - started) * 1000)
