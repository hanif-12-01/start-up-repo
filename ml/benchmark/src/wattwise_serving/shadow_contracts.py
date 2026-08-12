from __future__ import annotations

import math
import re
from dataclasses import asdict, dataclass
from datetime import date
from typing import Any, Literal

SHADOW_SCHEMA_VERSION = "2.0"
PERIOD = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")
SAFE_ID = re.compile(r"^[A-Za-z0-9:._-]{1,128}$")
SHA256 = re.compile(r"^[0-9a-f]{64}$")

HistoryPhase = Literal["H00", "H01_02", "H03_05", "H06_12", "H13_PLUS"]
ModelRoute = Literal["deterministic_baseline", "nbeats"]

HISTORY_ROUTES: tuple[tuple[int, int | None, HistoryPhase, ModelRoute], ...] = (
    (0, 0, "H00", "deterministic_baseline"),
    (1, 2, "H01_02", "deterministic_baseline"),
    (3, 5, "H03_05", "deterministic_baseline"),
    (6, 12, "H06_12", "nbeats"),
    (13, None, "H13_PLUS", "nbeats"),
)

FALLBACK_REASONS = {
    "FALLBACK_INSUFFICIENT_HISTORY",
    "FALLBACK_ARTIFACT_UNAVAILABLE",
    "FALLBACK_INFERENCE_FAILURE",
    "FALLBACK_INVALID_OUTPUT",
    "FALLBACK_SCHEMA_MISMATCH",
    "FALLBACK_INVALID_INPUT",
}

OBSERVABILITY_FIELDS = (
    "request_id",
    "forecast_timestamp",
    "history_phase",
    "selected_model",
    "model_version",
    "prediction_kwh",
    "deterministic_prediction_kwh",
    "latency_ms",
    "fallback_used",
    "fallback_reason",
    "artifact_version",
)

DEFERRED_OUTCOME_FIELDS = ("actual_kwh", "absolute_error", "percentage_error")


class ShadowContractError(ValueError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


def route_history(available_valid_history_months: int) -> tuple[HistoryPhase, ModelRoute]:
    if type(available_valid_history_months) is not int or available_valid_history_months < 0:
        raise ShadowContractError("INVALID_HISTORY_COUNT", "History count must be nonnegative.")
    for minimum, maximum, phase, model in HISTORY_ROUTES:
        if available_valid_history_months >= minimum and (
            maximum is None or available_valid_history_months <= maximum
        ):
            return phase, model
    raise AssertionError("history routing table is incomplete")


def next_month(value: str) -> str:
    year, month = (int(part) for part in value.split("-"))
    return f"{year + 1:04d}-01" if month == 12 else f"{year:04d}-{month + 1:02d}"


def _validate_period(value: Any, field: str) -> str:
    if not isinstance(value, str) or PERIOD.fullmatch(value) is None:
        raise ShadowContractError("INVALID_PERIOD", f"{field} must use YYYY-MM.")
    try:
        year, month = (int(part) for part in value.split("-"))
        date(year, month, 1)
    except ValueError as exc:
        raise ShadowContractError("INVALID_PERIOD", f"{field} is not a calendar month.") from exc
    return value


@dataclass(frozen=True)
class HistoryPoint:
    period_month: str
    usage_kwh: float


@dataclass(frozen=True)
class ForecastRequest:
    request_id: str
    forecast_timestamp: str
    target_period: str
    history: tuple[HistoryPoint, ...]
    contextual_features: dict[str, Any]
    feature_schema_sha256: str

    @classmethod
    def from_dict(cls, payload: dict[str, Any]) -> ForecastRequest:
        required = {
            "schema_version",
            "request_id",
            "forecast_timestamp",
            "target_period",
            "history",
            "contextual_features",
            "feature_schema_sha256",
        }
        if not isinstance(payload, dict) or set(payload) != required:
            raise ShadowContractError("INVALID_REQUEST_KEYS", "Request fields do not match.")
        if payload["schema_version"] != SHADOW_SCHEMA_VERSION:
            raise ShadowContractError("SCHEMA_MISMATCH", "Unsupported request schema.")
        request_id = payload["request_id"]
        if not isinstance(request_id, str) or SAFE_ID.fullmatch(request_id) is None:
            raise ShadowContractError("INVALID_IDENTIFIER", "request_id is invalid.")
        forecast_timestamp = payload["forecast_timestamp"]
        if not isinstance(forecast_timestamp, str) or not forecast_timestamp.strip():
            raise ShadowContractError("INVALID_TIMESTAMP", "forecast_timestamp is required.")
        target_period = _validate_period(payload["target_period"], "target_period")
        schema_hash = payload["feature_schema_sha256"]
        if not isinstance(schema_hash, str) or SHA256.fullmatch(schema_hash) is None:
            raise ShadowContractError("SCHEMA_MISMATCH", "Feature schema hash is invalid.")

        raw_history = payload["history"]
        if not isinstance(raw_history, list):
            raise ShadowContractError("INVALID_HISTORY", "history must be a list.")
        history: list[HistoryPoint] = []
        previous: str | None = None
        for item in raw_history:
            if not isinstance(item, dict) or set(item) != {"period_month", "usage_kwh"}:
                raise ShadowContractError("INVALID_HISTORY", "History point fields do not match.")
            period = _validate_period(item["period_month"], "history.period_month")
            usage = item["usage_kwh"]
            if (
                isinstance(usage, bool)
                or not isinstance(usage, int | float)
                or not math.isfinite(float(usage))
            ):
                raise ShadowContractError("INVALID_HISTORY", "History usage must be finite.")
            if float(usage) < 0:
                raise ShadowContractError("NEGATIVE_USAGE", "Negative history usage is forbidden.")
            if previous is not None and next_month(previous) != period:
                raise ShadowContractError(
                    "NON_CONTIGUOUS_HISTORY",
                    "History must be unique, ordered, and calendar-contiguous.",
                )
            previous = period
            history.append(HistoryPoint(period, float(usage)))
        if previous is not None and next_month(previous) != target_period:
            raise ShadowContractError(
                "FUTURE_VALUE_FORBIDDEN",
                "Target must be the month immediately after historical input.",
            )

        context = payload["contextual_features"]
        allowed_context = {
            "dataset_source",
            "building_primary_use",
            "business_type",
            "building_area",
            "site",
            "timezone",
            "profile_eligible",
        }
        if not isinstance(context, dict) or set(context) != allowed_context:
            raise ShadowContractError("INVALID_CONTEXT", "Context fields do not match.")
        if not isinstance(context["dataset_source"], str) or not context["dataset_source"].strip():
            raise ShadowContractError("INVALID_CONTEXT", "dataset_source is required.")
        if type(context["profile_eligible"]) is not bool:
            raise ShadowContractError("INVALID_CONTEXT", "profile_eligible must be boolean.")
        for field in ("building_primary_use", "business_type", "site", "timezone"):
            if context[field] is not None and (
                not isinstance(context[field], str) or not context[field].strip()
            ):
                raise ShadowContractError("INVALID_CONTEXT", f"{field} is invalid.")
        area = context["building_area"]
        if area is not None and (
            isinstance(area, bool)
            or not isinstance(area, int | float)
            or not math.isfinite(float(area))
            or float(area) <= 0
        ):
            raise ShadowContractError("INVALID_CONTEXT", "building_area is invalid.")

        return cls(
            request_id=request_id,
            forecast_timestamp=forecast_timestamp,
            target_period=target_period,
            history=tuple(history),
            contextual_features=dict(context),
            feature_schema_sha256=schema_hash,
        )

    @property
    def history_phase(self) -> HistoryPhase:
        return route_history(len(self.history))[0]

    @property
    def selected_route(self) -> ModelRoute:
        return route_history(len(self.history))[1]


@dataclass(frozen=True)
class ForecastResult:
    request_id: str
    forecast_timestamp: str
    history_phase: HistoryPhase | str
    prediction_kwh: float | None
    selected_model: str
    model_version: str
    fallback_used: bool
    fallback_reason: str | None
    inference_latency_ms: float
    artifact_version: str
    deterministic_prediction_kwh: float | None
    outcome: str

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)
