from __future__ import annotations

import hashlib
from dataclasses import dataclass

import pandas as pd

from wattwise_benchmark.config import stable_json


@dataclass(frozen=True)
class DatasetCohort:
    id: str
    name: str
    description: str
    included_dataset_ids: tuple[str, ...]
    allowed_dataset_provenances: tuple[str, ...]
    allowed_measurement_methods: tuple[str, ...]
    allowed_domains: tuple[str, ...]


COHORT_REGISTRY: dict[str, DatasetCohort] = {
    "MEASURED_BASELINE": DatasetCohort(
        id="MEASURED_BASELINE",
        name="Measured Public Baseline",
        description=(
            "Historical benchmark baseline cohort consisting of physical "
            "meter data from UCI ELD and BDG2."
        ),
        included_dataset_ids=("uci_eld", "bdg2"),
        allowed_dataset_provenances=("PUBLIC",),
        allowed_measurement_methods=("UTILITY_METER", "SMART_METER"),
        allowed_domains=("PUBLIC_RESIDENTIAL_COMMERCIAL", "PUBLIC_COMMERCIAL"),
    ),
    "MEASURED_PUBLIC": DatasetCohort(
        id="MEASURED_PUBLIC",
        name="Expanded Measured Public Panel",
        description=(
            "Full physical meter public cohort including UCI ELD, BDG2, "
            "and London SmartMeter."
        ),
        included_dataset_ids=("uci_eld", "bdg2", "london_smartmeter"),
        allowed_dataset_provenances=("PUBLIC",),
        allowed_measurement_methods=("UTILITY_METER", "SMART_METER"),
        allowed_domains=(
            "PUBLIC_RESIDENTIAL_COMMERCIAL",
            "PUBLIC_COMMERCIAL",
            "PUBLIC_RESIDENTIAL",
        ),
    ),
    "MEASURED_COMMERCIAL": DatasetCohort(
        id="MEASURED_COMMERCIAL",
        name="Measured Commercial Panel",
        description="Commercial building physical meter cohort from BDG2.",
        included_dataset_ids=("bdg2",),
        allowed_dataset_provenances=("PUBLIC",),
        allowed_measurement_methods=("SMART_METER",),
        allowed_domains=("PUBLIC_COMMERCIAL",),
    ),
    "RESIDENTIAL_PROXY": DatasetCohort(
        id="RESIDENTIAL_PROXY",
        name="Residential Household Proxy Panel",
        description="London SmartMeter household interval dataset.",
        included_dataset_ids=("london_smartmeter",),
        allowed_dataset_provenances=("PUBLIC",),
        allowed_measurement_methods=("SMART_METER",),
        allowed_domains=("PUBLIC_RESIDENTIAL",),
    ),
    "SIMULATED_COMMERCIAL": DatasetCohort(
        id="SIMULATED_COMMERCIAL",
        name="Simulated Commercial Building Stock Panel",
        description="NREL ComStock commercial building profile simulations.",
        included_dataset_ids=("nrel_comstock",),
        allowed_dataset_provenances=("PUBLIC",),
        allowed_measurement_methods=("MODELED_SIMULATION",),
        allowed_domains=("PUBLIC_COMMERCIAL",),
    ),
    "ALL_PUBLIC_RESEARCH": DatasetCohort(
        id="ALL_PUBLIC_RESEARCH",
        name="All Public Research Panel",
        description=(
            "Combined public dataset research panel including physical "
            "meters and building simulations."
        ),
        included_dataset_ids=("uci_eld", "bdg2", "london_smartmeter", "nrel_comstock"),
        allowed_dataset_provenances=("PUBLIC",),
        allowed_measurement_methods=("UTILITY_METER", "SMART_METER", "MODELED_SIMULATION"),
        allowed_domains=(
            "PUBLIC_RESIDENTIAL_COMMERCIAL",
            "PUBLIC_COMMERCIAL",
            "PUBLIC_RESIDENTIAL",
        ),
    ),
}


def compute_logical_dataset_sha256(df: pd.DataFrame) -> str:
    """
    Computes a deterministic logical hash for a canonical monthly dataset.
    Sorts by (dataset_source, entity_id, period_month) and serializes stable fields.
    """
    if df.empty:
        return hashlib.sha256(b"EMPTY_PANEL").hexdigest()

    cols = ["dataset_source", "entity_id", "period_month", "usage_kwh"]
    work = df[cols].copy()
    work["period_month"] = pd.to_datetime(work["period_month"]).dt.strftime("%Y-%m-%d")
    work["usage_kwh"] = work["usage_kwh"].round(4)
    sorted_df = work.sort_values(
        ["dataset_source", "entity_id", "period_month"]
    ).reset_index(drop=True)

    records = sorted_df.to_dict(orient="records")
    serialized = stable_json(records)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def validate_cohort_assertions(panel: pd.DataFrame, cohort_id: str) -> bool:
    if cohort_id not in COHORT_REGISTRY:
        raise KeyError(f"Unknown cohort_id '{cohort_id}'")
    cohort = COHORT_REGISTRY[cohort_id]

    if panel.empty:
        return True

    datasets = set(panel["dataset_source"].unique())
    missing_ds = datasets - set(cohort.included_dataset_ids)
    if missing_ds:
        raise ValueError(
            f"Cohort '{cohort_id}' contains unallowed dataset_source: {missing_ds}"
        )

    if "dataset_provenance" in panel.columns:
        provenances = set(panel["dataset_provenance"].unique())
        missing_prov = provenances - set(cohort.allowed_dataset_provenances)
        if missing_prov:
            raise ValueError(
                f"Cohort '{cohort_id}' contains unallowed provenance: {missing_prov}"
            )

    if "measurement_method" in panel.columns:
        methods = set(panel["measurement_method"].unique())
        missing_meth = methods - set(cohort.allowed_measurement_methods)
        if missing_meth:
            raise ValueError(
                f"Cohort '{cohort_id}' contains unallowed measurement method: {missing_meth}"
            )

    return True
