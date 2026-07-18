from __future__ import annotations

from dataclasses import asdict, dataclass
from enum import StrEnum
from typing import Any


class ProductPhase(StrEnum):
    H00_02 = "H00_02"
    H03_05 = "H03_05"
    H06_12 = "H06_12"
    H13_PLUS = "H13_PLUS"


class ReportingPhase(StrEnum):
    H00 = "H00"
    H01_02 = "H01_02"
    H03_05 = "H03_05"
    H06_12 = "H06_12"
    H13_PLUS = "H13_PLUS"


def product_phase(history_month_count: int) -> ProductPhase:
    if history_month_count < 0:
        raise ValueError("history_month_count cannot be negative")
    if history_month_count <= 2:
        return ProductPhase.H00_02
    if history_month_count <= 5:
        return ProductPhase.H03_05
    if history_month_count <= 12:
        return ProductPhase.H06_12
    return ProductPhase.H13_PLUS


def reporting_phase(history_month_count: int) -> ReportingPhase:
    if history_month_count < 0:
        raise ValueError("history_month_count cannot be negative")
    if history_month_count == 0:
        return ReportingPhase.H00
    if history_month_count <= 2:
        return ReportingPhase.H01_02
    if history_month_count <= 5:
        return ReportingPhase.H03_05
    if history_month_count <= 12:
        return ReportingPhase.H06_12
    return ReportingPhase.H13_PLUS


def initial_subgroup(history_month_count: int) -> str | None:
    if history_month_count == 0:
        return "H00"
    if history_month_count in {1, 2}:
        return "H01_02"
    return None


@dataclass(frozen=True)
class ModelPrediction:
    model_key: str
    model_version: str
    eligible: bool
    ineligibility_reason: str | None
    prediction_kwh: float | None
    lower_interval: float | None
    upper_interval: float | None
    training_duration: float
    inference_duration: float
    random_seed: int
    failure_reason: str | None
    artifact_fingerprint: str | None
    feature_manifest_fingerprint: str

    def as_record(self) -> dict[str, Any]:
        return asdict(self)
