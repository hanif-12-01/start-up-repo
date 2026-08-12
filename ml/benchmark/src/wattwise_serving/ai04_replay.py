from __future__ import annotations

import hashlib
import math
import time
from collections.abc import Iterable
from dataclasses import dataclass
from typing import Any

import numpy as np

from wattwise_benchmark.models.deterministic import deterministic_forecast
from wattwise_serving.ai04_contracts import ShadowObservation, ShadowResult, assert_pii_free
from wattwise_serving.ai04_worker import IsolatedModelWorker, WorkerResponse
from wattwise_serving.shadow_contracts import ForecastRequest


@dataclass(frozen=True)
class FrozenPackage:
    nbeats_version: str
    nbeats_sha256: str
    feature_schema_sha256: str


class ShadowReplayRunner:
    def __init__(self, worker: IsolatedModelWorker, package: FrozenPackage) -> None:
        self.worker = worker
        self.package = package

    def run_one(
        self,
        observation: ShadowObservation,
        *,
        worker_behavior: str = "normal",
        sleep_seconds: float = 60.0,
        worker_timeout_ms: float | None = None,
    ) -> ShadowResult:
        started = time.perf_counter()
        request = ForecastRequest.from_dict(observation.inference_payload())
        history = [point.usage_kwh for point in request.history]
        deterministic = deterministic_forecast(history)
        phase = request.history_phase
        route = request.selected_route
        if route == "deterministic_baseline":
            result = self._result(
                observation,
                phase,
                deterministic,
                None,
                "deterministic_baseline",
                "deterministic-baseline-v1",
                True,
                "FALLBACK_INSUFFICIENT_HISTORY",
                None,
                started,
            )
            assert_pii_free(result.as_dict())
            return result
        if request.feature_schema_sha256 != self.package.feature_schema_sha256:
            result = self._result(
                observation,
                phase,
                deterministic,
                None,
                "deterministic_baseline",
                "deterministic-baseline-v1",
                True,
                "FALLBACK_SCHEMA_MISMATCH",
                None,
                started,
            )
            assert_pii_free(result.as_dict())
            return result
        response = self.worker.predict(
            request,
            behavior=worker_behavior,
            sleep_seconds=sleep_seconds,
            timeout_ms=worker_timeout_ms,
        )
        prediction = response.prediction_kwh
        if response.status == "SUCCESS" and (
            prediction is None or not math.isfinite(prediction) or prediction < 0
        ):
            response = WorkerResponse(
                "INVALID_OUTPUT",
                None,
                response.inference_latency_ms,
                response.worker_id,
                response.worker_generation,
                response.rss_bytes,
                response.recycle_ms,
            )
        reason_by_status = {
            "TIMEOUT": "FALLBACK_WORKER_TIMEOUT",
            "WORKER_CRASH": "FALLBACK_WORKER_CRASH",
            "ARTIFACT_FAILURE": "FALLBACK_ARTIFACT_UNAVAILABLE",
            "INVALID_OUTPUT": "FALLBACK_INVALID_OUTPUT",
        }
        success = response.status == "SUCCESS"
        result = self._result(
            observation,
            phase,
            deterministic,
            prediction if success else None,
            "nbeats" if success else "deterministic_baseline",
            self.package.nbeats_version if success else "deterministic-baseline-v1",
            not success,
            None if success else reason_by_status.get(response.status, "FALLBACK_WORKER_FAILURE"),
            response,
            started,
        )
        assert_pii_free(result.as_dict())
        return result

    def run(self, observations: Iterable[ShadowObservation]) -> list[ShadowResult]:
        return [self.run_one(observation) for observation in observations]

    def _result(
        self,
        observation: ShadowObservation,
        phase: str,
        deterministic: float | None,
        nbeats: float | None,
        selected_model: str,
        model_version: str,
        fallback_used: bool,
        fallback_reason: str | None,
        response: WorkerResponse | None,
        started: float,
    ) -> ShadowResult:
        actual = observation.actual_kwh
        return ShadowResult(
            shadow_request_id=observation.shadow_request_id,
            data_provenance=observation.data_provenance,
            forecast_timestamp=observation.forecast_origin,
            target_period=observation.target_period,
            history_phase=phase,
            request_class=(
                "VALID_ELIGIBLE_REQUEST"
                if phase in {"H06_12", "H13_PLUS"}
                else "INELIGIBLE_SHORT_HISTORY"
            ),
            selected_shadow_model=selected_model,
            model_version=model_version,
            artifact_sha256=self.package.nbeats_sha256 if nbeats is not None else None,
            nbeats_prediction_kwh=nbeats,
            deterministic_prediction_kwh=deterministic,
            fallback_used=fallback_used,
            fallback_reason=fallback_reason,
            worker_id=None if response is None else response.worker_id,
            worker_generation=None if response is None else response.worker_generation,
            worker_rss_bytes=None if response is None else response.rss_bytes,
            inference_latency_ms=(
                None if response is None else response.inference_latency_ms
            ),
            total_shadow_latency_ms=(time.perf_counter() - started) * 1000.0,
            actual_kwh=actual,
            actual_available=actual is not None,
            absolute_error_nbeats=(
                abs(nbeats - actual) if nbeats is not None and actual is not None else None
            ),
            absolute_error_deterministic=(
                abs(deterministic - actual)
                if deterministic is not None and actual is not None
                else None
            ),
            replay_purpose=observation.replay_purpose,
        )


def replay_fingerprint(results: Iterable[ShadowResult]) -> str:
    stable = [
        (
            result.shadow_request_id,
            result.history_phase,
            result.selected_shadow_model,
            result.fallback_reason,
            None
            if result.nbeats_prediction_kwh is None
            else round(result.nbeats_prediction_kwh, 8),
            result.deterministic_prediction_kwh,
        )
        for result in results
    ]
    return hashlib.sha256(repr(stable).encode()).hexdigest()


def real_accuracy_summary(results: Iterable[ShadowResult]) -> dict[str, Any]:
    paired = [
        item
        for item in results
        if item.data_provenance == "REAL_WATTWISE"
        and item.replay_purpose == "OPERATIONAL_REPLAY"
        and item.actual_kwh is not None
        and item.nbeats_prediction_kwh is not None
        and item.deterministic_prediction_kwh is not None
    ]
    count = len(paired)
    tier = (
        "NO_REAL_ACCURACY_EVIDENCE"
        if count == 0
        else "PRELIMINARY_ONLY"
        if count < 30
        else "EVALUABLE_BUT_NOT_PROMOTION_GRADE"
        if count < 100
        else "PROMOTION_GRADE_ELIGIBLE"
    )
    if not paired:
        return {
            "paired_observation_count": 0,
            "evidence_tier": tier,
            "conclusion": "INSUFFICIENT_REAL_WATTWISE_EVIDENCE",
            "bootstrap_ci": "NOT_ENOUGH_DATA",
        }
    actual = np.asarray([item.actual_kwh for item in paired], dtype=float)
    model = np.asarray([item.nbeats_prediction_kwh for item in paired], dtype=float)
    baseline = np.asarray([item.deterministic_prediction_kwh for item in paired], dtype=float)
    model_error = model - actual
    baseline_error = baseline - actual

    def metrics(error: np.ndarray, prediction: np.ndarray) -> dict[str, float]:
        absolute = np.abs(error)
        denominator = np.abs(actual).sum()
        smape_denominator = np.abs(actual) + np.abs(prediction)
        return {
            "mae": float(absolute.mean()),
            "rmse": float(np.sqrt(np.square(error).mean())),
            "wmape": float(absolute.sum() / denominator) if denominator else float("nan"),
            "smape": float(
                np.divide(
                    2 * absolute,
                    smape_denominator,
                    out=np.zeros_like(absolute),
                    where=smape_denominator > 0,
                ).mean()
            ),
            "median_absolute_error": float(np.median(absolute)),
            "p90_absolute_error": float(np.quantile(absolute, 0.9)),
            "signed_bias": float(error.mean()),
            "over_prediction_rate": float((error > 0).mean()),
            "under_prediction_rate": float((error < 0).mean()),
        }

    model_metrics = metrics(model_error, model)
    baseline_metrics = metrics(baseline_error, baseline)
    output: dict[str, Any] = {
        "paired_observation_count": count,
        "evidence_tier": tier,
        "nbeats": model_metrics,
        "deterministic": baseline_metrics,
        "relative_mae_improvement": (
            (baseline_metrics["mae"] - model_metrics["mae"])
            / baseline_metrics["mae"]
            if baseline_metrics["mae"]
            else float("nan")
        ),
        "conclusion": (
            "MEASURED_REAL_WATTWISE_EVIDENCE" if count >= 30 else "PRELIMINARY_ONLY"
        ),
        "bootstrap_ci": "NOT_ENOUGH_DATA",
    }
    if count >= 30:
        differences = np.abs(model_error) - np.abs(baseline_error)
        rng = np.random.default_rng(20260812)
        indices = rng.integers(0, count, size=(1000, count))
        samples = differences[indices].mean(axis=1)
        output["bootstrap_ci"] = [
            float(np.quantile(samples, 0.025)),
            float(np.quantile(samples, 0.975)),
        ]
        output["bootstrap_samples"] = 1000
    return output


def operational_summary(results: Iterable[ShadowResult]) -> dict[str, Any]:
    rows = list(results)
    eligible = [row for row in rows if row.request_class == "VALID_ELIGIBLE_REQUEST"]
    normal_eligible = [row for row in eligible if row.replay_purpose == "OPERATIONAL_REPLAY"]
    successes = [row for row in normal_eligible if row.nbeats_prediction_kwh is not None]
    failures = [row for row in normal_eligible if row.nbeats_prediction_kwh is None]
    return {
        "total_requests": len(rows),
        "eligible_ml_requests": len(normal_eligible),
        "nbeats_success": len(successes),
        "fallback_count": len(failures),
        "system_failure_rate": len(failures) / len(normal_eligible) if normal_eligible else 0.0,
        "route_distribution": {
            phase: sum(row.history_phase == phase for row in rows)
            for phase in ("H00", "H01_02", "H03_05", "H06_12", "H13_PLUS")
        },
        "provenance_counts": {
            provenance: sum(row.data_provenance == provenance for row in rows)
            for provenance in (
                "REAL_WATTWISE",
                "PUBLIC_PROXY",
                "MODELED_SIMULATION",
                "SYNTHETIC_DEMO",
            )
        },
        "uncaught_exceptions": 0,
    }
