from __future__ import annotations

import math
from dataclasses import asdict, dataclass
from datetime import datetime
from typing import Any, Literal

from wattwise_serving.shadow_contracts import ForecastRequest

DataProvenance = Literal[
    "REAL_WATTWISE",
    "PUBLIC_PROXY",
    "MODELED_SIMULATION",
    "SYNTHETIC_DEMO",
]

ALLOWED_PROVENANCE = {
    "REAL_WATTWISE",
    "PUBLIC_PROXY",
    "MODELED_SIMULATION",
    "SYNTHETIC_DEMO",
}
SHADOW_RESULT_CAN_OVERRIDE_USER_FORECAST = False


class ShadowReplayError(ValueError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


@dataclass(frozen=True)
class ShadowObservation:
    shadow_request_id: str
    shadow_entity_id: str
    data_provenance: DataProvenance
    forecast_origin: str
    target_period: str
    history: list[dict[str, Any]]
    contextual_features: dict[str, Any]
    feature_schema_sha256: str
    actual_kwh: float | None
    replay_purpose: Literal["OPERATIONAL_REPLAY", "LOAD_TEST_REPLAY"]

    @classmethod
    def from_dict(cls, value: dict[str, Any]) -> ShadowObservation:
        required = {
            "shadow_request_id",
            "shadow_entity_id",
            "data_provenance",
            "forecast_origin",
            "target_period",
            "history",
            "contextual_features",
            "feature_schema_sha256",
            "actual_kwh",
            "replay_purpose",
        }
        if not isinstance(value, dict) or set(value) != required:
            raise ShadowReplayError("INVALID_SHADOW_KEYS", "Shadow fields do not match.")
        provenance = value["data_provenance"]
        if provenance not in ALLOWED_PROVENANCE:
            raise ShadowReplayError("INVALID_PROVENANCE", "Unknown data provenance.")
        actual = value["actual_kwh"]
        if actual is not None and (
            isinstance(actual, bool)
            or not isinstance(actual, int | float)
            or not math.isfinite(float(actual))
            or float(actual) < 0
        ):
            raise ShadowReplayError(
                "INVALID_ACTUAL", "Actual usage must be finite and nonnegative."
            )
        purpose = value["replay_purpose"]
        if purpose not in {"OPERATIONAL_REPLAY", "LOAD_TEST_REPLAY"}:
            raise ShadowReplayError("INVALID_REPLAY_PURPOSE", "Replay purpose is invalid.")
        request = ForecastRequest.from_dict(
            {
                "schema_version": "2.0",
                "request_id": value["shadow_request_id"],
                "forecast_timestamp": value["forecast_origin"],
                "target_period": value["target_period"],
                "history": value["history"],
                "contextual_features": value["contextual_features"],
                "feature_schema_sha256": value["feature_schema_sha256"],
            }
        )
        try:
            origin = datetime.fromisoformat(request.forecast_timestamp.replace("Z", "+00:00"))
            target_start = datetime.fromisoformat(f"{request.target_period}-01T00:00:00+00:00")
        except ValueError as exc:
            raise ShadowReplayError(
                "INVALID_FORECAST_ORIGIN", "Forecast origin is invalid."
            ) from exc
        if origin >= target_start:
            raise ShadowReplayError(
                "FORECAST_ORIGIN_NOT_HISTORICAL",
                "Forecast origin must precede the target month.",
            )
        if value["shadow_entity_id"] in {None, ""}:
            raise ShadowReplayError("INVALID_ENTITY", "Opaque shadow entity ID is required.")
        # The actual is deliberately validated only after the inference request is built.
        return cls(
            shadow_request_id=request.request_id,
            shadow_entity_id=str(value["shadow_entity_id"]),
            data_provenance=provenance,
            forecast_origin=request.forecast_timestamp,
            target_period=request.target_period,
            history=[dict(item) for item in value["history"]],
            contextual_features=dict(value["contextual_features"]),
            feature_schema_sha256=request.feature_schema_sha256,
            actual_kwh=None if actual is None else float(actual),
            replay_purpose=purpose,
        )

    def inference_payload(self) -> dict[str, Any]:
        """Return only pre-origin inference data; actual usage cannot cross this boundary."""
        return {
            "schema_version": "2.0",
            "request_id": self.shadow_request_id,
            "forecast_timestamp": self.forecast_origin,
            "target_period": self.target_period,
            "history": [dict(item) for item in self.history],
            "contextual_features": dict(self.contextual_features),
            "feature_schema_sha256": self.feature_schema_sha256,
        }


@dataclass(frozen=True)
class ShadowResult:
    shadow_request_id: str
    data_provenance: str
    forecast_timestamp: str
    target_period: str
    history_phase: str
    request_class: str
    selected_shadow_model: str
    model_version: str
    artifact_sha256: str | None
    nbeats_prediction_kwh: float | None
    deterministic_prediction_kwh: float | None
    fallback_used: bool
    fallback_reason: str | None
    worker_id: str | None
    worker_generation: int | None
    worker_rss_bytes: int | None
    inference_latency_ms: float | None
    total_shadow_latency_ms: float
    actual_kwh: float | None
    actual_available: bool
    absolute_error_nbeats: float | None
    absolute_error_deterministic: float | None
    replay_purpose: str

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


PII_FORBIDDEN_FIELDS = {
    "email",
    "name",
    "address",
    "user_id",
    "auth_id",
    "token",
    "credential",
}


def assert_pii_free(record: dict[str, Any]) -> None:
    keys = {str(key).lower() for key in record}
    intersection = keys & PII_FORBIDDEN_FIELDS
    if intersection:
        raise ShadowReplayError("PII_FIELD_FORBIDDEN", f"Forbidden PII fields: {intersection}")
