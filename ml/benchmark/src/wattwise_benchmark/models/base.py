from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Protocol

import numpy as np
import pandas as pd

from wattwise_benchmark.features import (
    CATEGORICAL_FEATURES,
    NUMERIC_FEATURES,
    feature_manifest_fingerprint,
)


@dataclass
class FitSummary:
    model_key: str
    model_version: str
    seed: int
    training_duration: float
    parameters: dict[str, Any]
    artifact_fingerprint: str
    feature_manifest_fingerprint: str = field(default_factory=feature_manifest_fingerprint)
    feature_importance: dict[str, float] = field(default_factory=dict)


class ForecastAdapter(Protocol):
    model_key: str
    model_version: str
    seed: int
    fit_summary: FitSummary | None

    def fit(self, train: pd.DataFrame, validation: pd.DataFrame) -> FitSummary: ...

    def predict(self, examples: pd.DataFrame) -> np.ndarray: ...

    def save(self, path: Path) -> str: ...


def eligibility_reason(model_key: str, row: pd.Series) -> str | None:
    history = int(row["history_month_count"])
    profile = bool(row["profile_eligible"])
    if model_key == "deterministic_baseline":
        return None if history >= 1 else "ZERO_HISTORY_NO_DETERMINISTIC_PATH"
    if model_key in {"nbeats", "deepar"}:
        return None if history >= 6 else "MINIMUM_CONTEXT_6_MONTHS"
    if history >= 1 or profile:
        return None
    return "ZERO_HISTORY_WITHOUT_STATIC_PROFILE"


def eligible_rows(model_key: str, examples: pd.DataFrame) -> pd.Series:
    return examples.apply(lambda row: eligibility_reason(model_key, row) is None, axis=1)


def model_fingerprint(model_key: str, version: str, seed: int, params: dict[str, Any]) -> str:
    payload = json.dumps(
        {"model_key": model_key, "version": version, "seed": seed, "params": params},
        sort_keys=True,
        separators=(",", ":"),
        default=str,
    )
    return hashlib.sha256(payload.encode()).hexdigest()


def feature_frame(examples: pd.DataFrame) -> pd.DataFrame:
    frame = examples[[*NUMERIC_FEATURES, *CATEGORICAL_FEATURES]].copy()
    for column in CATEGORICAL_FEATURES:
        frame[column] = frame[column].astype("string").fillna("__MISSING__")
    for column in NUMERIC_FEATURES:
        frame[column] = pd.to_numeric(frame[column], errors="coerce")
    return frame
