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


class DatasetProvenance(StrEnum):
    PUBLIC = "PUBLIC"
    SYNTHETIC = "SYNTHETIC"
    WATTWISE_REAL = "WATTWISE_REAL"


class MeasurementMethod(StrEnum):
    SMART_METER = "SMART_METER"
    UTILITY_METER = "UTILITY_METER"
    BILLING = "BILLING"
    DERIVED = "DERIVED"
    MODELED_SIMULATION = "MODELED_SIMULATION"
    UNKNOWN = "UNKNOWN"


class WattWiseUsageSource(StrEnum):
    USER_ENTERED = "USER_ENTERED"
    METER_DERIVED = "METER_DERIVED"
    LEGACY_UNKNOWN = "LEGACY_UNKNOWN"


class WattWiseDomain(StrEnum):
    KOS = "KOS"
    LAUNDRY = "LAUNDRY"
    RETAIL = "RETAIL"
    CULINARY = "CULINARY"
    SMALL_COMMERCIAL = "SMALL_COMMERCIAL"
    OTHER_UMKM = "OTHER_UMKM"
    PUBLIC_COMMERCIAL = "PUBLIC_COMMERCIAL"
    PUBLIC_RESIDENTIAL = "PUBLIC_RESIDENTIAL"
    PUBLIC_OTHER = "PUBLIC_OTHER"


@dataclass(frozen=True)
class CanonicalMonthlyRecordV2:
    dataset_source: str
    entity_id: str
    period_month: str
    usage_kwh: float
    dataset_provenance: DatasetProvenance = DatasetProvenance.PUBLIC
    measurement_method: MeasurementMethod = MeasurementMethod.UNKNOWN
    wattwise_usage_source: WattWiseUsageSource = WattWiseUsageSource.LEGACY_UNKNOWN
    domain: WattWiseDomain = WattWiseDomain.PUBLIC_OTHER
    schema_version: str = "2.0"
    source_granularity: str = "monthly"
    observation_count: int = 1
    expected_observation_count: int = 1
    coverage_ratio: float = 1.0
    tariff_per_kwh: float | None = None
    currency: str | None = "IDR"
    occupancy: float | None = None
    floor_area: float | None = None
    room_count: float | None = None
    employee_count: float | None = None
    operating_days: float | None = None
    temperature_mean: float | None = None
    temperature_min: float | None = None
    temperature_max: float | None = None
    is_synthetic: bool = False
    training_eligible: bool = True
    validation_eligible: bool = True
    final_evaluation_eligible: bool = True
    quality_flags: tuple[str, ...] = ("PASS",)
    source_license: str = "CC BY 4.0"
    source_version: str = "v1.0"

    def validate(self) -> None:
        if self.usage_kwh < 0.0:
            raise ValueError("usage_kwh cannot be negative")
        if not 0.0 <= self.coverage_ratio <= 1.0:
            raise ValueError("coverage_ratio must be between 0.0 and 1.0")

    def as_record(self) -> dict[str, Any]:
        return asdict(self)
