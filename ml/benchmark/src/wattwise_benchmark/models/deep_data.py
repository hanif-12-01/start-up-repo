from __future__ import annotations

from typing import Any

import pandas as pd
from pytorch_forecasting import TimeSeriesDataSet
from pytorch_forecasting.data import EncoderNormalizer, NaNLabelEncoder

from wattwise_benchmark.models.base import eligible_rows

STATIC_CATEGORICALS = [
    "dataset_source",
    "building_primary_use",
    "business_type",
    "site",
    "timezone",
]


def sequence_frame(examples: pd.DataFrame, model_key: str) -> pd.DataFrame:
    eligible = examples.loc[eligible_rows(model_key, examples)]
    records: list[dict[str, Any]] = []
    for row in eligible.itertuples(index=False):
        context = 6 if model_key == "nbeats" else 12
        history = list(row.history_values)[-context:]
        values = [*history, float(row.target_usage_kwh)]
        target = pd.Timestamp(row.target_period)
        periods = pd.date_range(end=target, periods=len(values), freq="MS")
        for time_idx, (period, value) in enumerate(zip(periods, values, strict=True)):
            records.append(
                {
                    "series_key": str(row.example_id),
                    "time_idx": time_idx,
                    "y": float(value),
                    "month": f"{period.month:02d}",
                    "dataset_source": str(row.dataset_source),
                    "building_primary_use": str(
                        row.building_primary_use
                        if pd.notna(row.building_primary_use)
                        else "__MISSING__"
                    ),
                    "business_type": str(
                        row.business_type if pd.notna(row.business_type) else "__MISSING__"
                    ),
                    "site": str(row.site if pd.notna(row.site) else "__MISSING__"),
                    "timezone": str(row.timezone if pd.notna(row.timezone) else "__MISSING__"),
                }
            )
    return pd.DataFrame(records)


def make_training_dataset(data: pd.DataFrame, model_key: str) -> TimeSeriesDataSet:
    common: dict[str, Any] = {
        "data": data,
        "time_idx": "time_idx",
        "target": "y",
        "group_ids": ["series_key"],
        "min_encoder_length": 6,
        "max_encoder_length": 6 if model_key == "nbeats" else 12,
        "min_prediction_length": 1,
        "max_prediction_length": 1,
        "allow_missing_timesteps": False,
        "randomize_length": False,
        "categorical_encoders": {"series_key": NaNLabelEncoder(add_nan=True)},
    }
    if model_key == "nbeats":
        return TimeSeriesDataSet(
            **common,
            target_normalizer=EncoderNormalizer(transformation="softplus"),
            time_varying_unknown_reals=["y"],
        )
    encoders = {
        **common["categorical_encoders"],
        "month": NaNLabelEncoder(add_nan=True),
        **{column: NaNLabelEncoder(add_nan=True) for column in STATIC_CATEGORICALS},
    }
    common["categorical_encoders"] = encoders
    return TimeSeriesDataSet(
        **common,
        static_categoricals=STATIC_CATEGORICALS,
        time_varying_known_categoricals=["month"],
        time_varying_unknown_reals=["y"],
        target_normalizer=EncoderNormalizer(transformation=None),
    )
