from __future__ import annotations

import pandas as pd
from wattwise_benchmark.contracts import DatasetProvenance, MeasurementMethod, WattWiseDomain
from wattwise_benchmark.ingestion.nrel_comstock import normalize_nrel_comstock


def test_normalize_nrel_comstock() -> None:
    # 720 hourly timestamps over 30 days
    timestamps = pd.date_range("2023-01-01", periods=720, freq="h")
    data = {
        "bldg_id": ["bldg_retail_101"] * 720,
        "timestamp": timestamps,
        "kwh": [10.0] * 720,
    }
    df = pd.DataFrame(data)
    records = normalize_nrel_comstock(df)

    assert len(records) == 1
    rec = records[0]
    assert rec.dataset_source == "nrel_comstock"
    assert rec.entity_id == "bldg_retail_101"
    assert rec.usage_kwh == 7200.0
    assert rec.domain == WattWiseDomain.PUBLIC_COMMERCIAL
    assert rec.measurement_method == MeasurementMethod.MODELED_SIMULATION
    assert rec.dataset_provenance == DatasetProvenance.PUBLIC
    assert rec.coverage_ratio == 1.0
