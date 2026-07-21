from __future__ import annotations

import math
import re
from dataclasses import dataclass
from datetime import date
from pathlib import PurePosixPath
from typing import Any

from wattwise_benchmark.contracts import reporting_phase

SCHEMA_VERSION = "1.0"
PHASE_MODEL = {
    "H00": "lightgbm",
    "H01_02": "deterministic_baseline",
    "H03_05": "lightgbm",
    "H06_12": "nbeats",
    "H13_PLUS": "nbeats",
}
REQUEST_KEYS = {
    "schema_version",
    "request_id",
    "entity_id",
    "reporting_phase",
    "target_period",
    "consumption_history",
    "contextual_features",
    "requested_horizon",
    "requested_model",
    "model_version",
}
CONTEXT_KEYS = {
    "dataset_source",
    "building_primary_use",
    "business_type",
    "building_area",
    "site",
    "timezone",
    "profile_eligible",
}
PERIOD = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")
SAFE_ID = re.compile(r"^[A-Za-z0-9:._-]{1,128}$")
SHA256 = re.compile(r"^[0-9a-f]{64}$")


class ContractError(ValueError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


@dataclass(frozen=True)
class ConsumptionPoint:
    period_month: str
    usage_kwh: float


@dataclass(frozen=True)
class PredictionRequest:
    request_id: str
    entity_id: str
    reporting_phase: str
    target_period: str
    consumption_history: tuple[ConsumptionPoint, ...]
    contextual_features: dict[str, Any]
    requested_horizon: int
    requested_model: str
    model_version: str

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> PredictionRequest:
        if set(data) != REQUEST_KEYS:
            raise ContractError("INVALID_REQUEST_KEYS", "Request fields do not match schema.")
        if data["schema_version"] != SCHEMA_VERSION:
            raise ContractError("UNSUPPORTED_SCHEMA", "Unsupported schema version.")
        for key in ("request_id", "entity_id"):
            if not isinstance(data[key], str) or SAFE_ID.fullmatch(data[key]) is None:
                raise ContractError("INVALID_IDENTIFIER", f"{key} is invalid.")
        if (
            not isinstance(data["model_version"], str)
            or SAFE_ID.fullmatch(data["model_version"]) is None
        ):
            raise ContractError("INVALID_MODEL_VERSION", "model_version is invalid.")
        if type(data["requested_horizon"]) is not int or data["requested_horizon"] != 1:
            raise ContractError("INVALID_HORIZON", "Only a one-month horizon is supported.")
        if (
            not isinstance(data["target_period"], str)
            or PERIOD.fullmatch(data["target_period"]) is None
        ):
            raise ContractError("INVALID_TARGET_PERIOD", "target_period must use YYYY-MM.")
        cls._validate_calendar_month(data["target_period"])

        context = data["contextual_features"]
        if not isinstance(context, dict) or set(context) != CONTEXT_KEYS:
            raise ContractError("INVALID_CONTEXT", "Context fields do not match schema.")
        if not isinstance(context["dataset_source"], str) or not context["dataset_source"].strip():
            raise ContractError("INVALID_CONTEXT", "dataset_source is required.")
        if type(context["profile_eligible"]) is not bool:
            raise ContractError("INVALID_CONTEXT", "profile_eligible must be boolean.")
        for field in ("building_primary_use", "business_type", "site", "timezone"):
            if context[field] is not None and (
                not isinstance(context[field], str) or not context[field].strip()
            ):
                raise ContractError("INVALID_CONTEXT", f"{field} must be nonblank string or null.")
        area = context["building_area"]
        if area is not None and (
            isinstance(area, bool)
            or not isinstance(area, int | float)
            or not math.isfinite(float(area))
            or float(area) <= 0
        ):
            raise ContractError("INVALID_CONTEXT", "building_area must be positive finite or null.")

        history_raw = data["consumption_history"]
        if not isinstance(history_raw, list):
            raise ContractError("INVALID_HISTORY", "consumption_history must be a list.")
        history: list[ConsumptionPoint] = []
        previous: str | None = None
        for item in history_raw:
            if not isinstance(item, dict) or set(item) != {"period_month", "usage_kwh"}:
                raise ContractError("INVALID_HISTORY", "History point fields do not match schema.")
            period = item["period_month"]
            usage = item["usage_kwh"]
            if not isinstance(period, str) or PERIOD.fullmatch(period) is None:
                raise ContractError("INVALID_HISTORY", "History period is malformed.")
            cls._validate_calendar_month(period)
            if (
                isinstance(usage, bool)
                or not isinstance(usage, int | float)
                or not math.isfinite(float(usage))
                or float(usage) < 0
            ):
                raise ContractError(
                    "INVALID_HISTORY", "History usage must be finite and nonnegative."
                )
            if previous is not None and cls._next_month(previous) != period:
                raise ContractError(
                    "NON_CONTIGUOUS_HISTORY", "History must be ordered and contiguous."
                )
            previous = period
            history.append(ConsumptionPoint(period, float(usage)))

        expected_phase = str(reporting_phase(len(history)))
        if data["reporting_phase"] != expected_phase:
            raise ContractError("PHASE_MISMATCH", "Reporting phase does not match history.")
        expected_model = PHASE_MODEL[expected_phase]
        if data["requested_model"] != expected_model:
            raise ContractError(
                "MODEL_PHASE_MISMATCH", "Requested model does not match phase routing."
            )
        if previous is not None and cls._next_month(previous) != data["target_period"]:
            raise ContractError(
                "TARGET_PERIOD_MISMATCH", "Target must follow the final history month."
            )

        return cls(
            request_id=data["request_id"],
            entity_id=data["entity_id"],
            reporting_phase=expected_phase,
            target_period=data["target_period"],
            consumption_history=tuple(history),
            contextual_features=dict(context),
            requested_horizon=1,
            requested_model=expected_model,
            model_version=data["model_version"],
        )

    @staticmethod
    def _validate_calendar_month(value: str) -> None:
        try:
            year, month = (int(part) for part in value.split("-"))
            date(year, month, 1)
        except ValueError as exc:
            raise ContractError("INVALID_CALENDAR_MONTH", "Calendar month is invalid.") from exc

    @staticmethod
    def _next_month(value: str) -> str:
        year, month = (int(part) for part in value.split("-"))
        if month == 12:
            return f"{year + 1:04d}-01"
        return f"{year:04d}-{month + 1:02d}"


def response(
    request: PredictionRequest,
    *,
    status: str,
    prediction_kwh: float | None,
    eligibility_status: str,
    fallback_reason: str | None,
    latency_ms: float,
    artifact_identifier: str | None,
    artifact_sha256: str | None,
    warnings: list[str] | None = None,
    error_code: str | None = None,
) -> dict[str, Any]:
    if status not in {"SUCCESS", "NOT_ELIGIBLE", "ERROR"}:
        raise ContractError("INVALID_RESPONSE", "Unsupported response status.")
    if eligibility_status not in {"ELIGIBLE", "NOT_ELIGIBLE"}:
        raise ContractError("INVALID_RESPONSE", "Unsupported eligibility status.")

    nullable_strings = {
        "fallback_reason": fallback_reason,
        "artifact_identifier": artifact_identifier,
        "artifact_sha256": artifact_sha256,
        "error_code": error_code,
    }
    for field, value in nullable_strings.items():
        if value is not None and (not isinstance(value, str) or not value.strip()):
            raise ContractError("INVALID_RESPONSE", f"{field} is malformed.")

    normalized_warnings = [] if warnings is None else warnings
    if not isinstance(normalized_warnings, list) or any(
        not isinstance(value, str) or not value.strip() or len(value) > 200
        for value in normalized_warnings
    ):
        raise ContractError("INVALID_RESPONSE", "warnings are malformed.")
    if (
        isinstance(latency_ms, bool)
        or not isinstance(latency_ms, int | float)
        or not math.isfinite(float(latency_ms))
        or latency_ms < 0
    ):
        raise ContractError("INVALID_RESPONSE", "Latency must be finite and nonnegative.")

    if status == "SUCCESS":
        if (
            isinstance(prediction_kwh, bool)
            or not isinstance(prediction_kwh, int | float)
            or not math.isfinite(float(prediction_kwh))
            or prediction_kwh < 0
        ):
            raise ContractError("NON_FINITE_OUTPUT", "Prediction must be finite and nonnegative.")
        if (
            eligibility_status != "ELIGIBLE"
            or fallback_reason is not None
            or error_code is not None
            or artifact_identifier is None
            or artifact_sha256 is None
        ):
            raise ContractError("INVALID_RESPONSE", "Success fields are inconsistent.")
    elif prediction_kwh is not None:
        raise ContractError("INVALID_RESPONSE", "Non-success response cannot contain prediction.")

    if status == "NOT_ELIGIBLE" and (
        eligibility_status != "NOT_ELIGIBLE" or fallback_reason is None or error_code is not None
    ):
        raise ContractError("INVALID_RESPONSE", "Eligibility fields are inconsistent.")
    if status == "ERROR" and (
        eligibility_status != "ELIGIBLE" or fallback_reason is None or error_code is None
    ):
        raise ContractError("INVALID_RESPONSE", "Error fields are inconsistent.")

    if artifact_sha256 is not None and SHA256.fullmatch(artifact_sha256) is None:
        raise ContractError("INVALID_RESPONSE", "Artifact checksum is invalid.")
    if artifact_identifier is not None:
        artifact_path = PurePosixPath(artifact_identifier)
        if (
            artifact_path.is_absolute()
            or "\\" in artifact_identifier
            or ":" in artifact_identifier
            or "//" in artifact_identifier
            or any(part in {"", ".", ".."} for part in artifact_path.parts)
        ):
            raise ContractError("INVALID_RESPONSE", "Artifact identifier is unsafe.")
    return {
        "schema_version": SCHEMA_VERSION,
        "request_id": request.request_id,
        "status": status,
        "selected_model": request.requested_model,
        "model_version": request.model_version,
        "reporting_phase": request.reporting_phase,
        "prediction_kwh": prediction_kwh,
        "eligibility_status": eligibility_status,
        "fallback_reason": fallback_reason,
        "inference_latency_ms": latency_ms,
        "artifact_identifier": artifact_identifier,
        "artifact_sha256": artifact_sha256,
        "warnings": normalized_warnings,
        "error_code": error_code,
    }
