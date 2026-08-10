from __future__ import annotations

import pandas as pd
from wattwise_benchmark.contracts import DatasetProvenance, MeasurementMethod, WattWiseDomain
from wattwise_benchmark.ingestion.london import normalize_london_smartmeter


def test_normalize_london_smartmeter() -> None:
    # 1440 half-hourly timestamps over 30 days
    timestamps = pd.date_range("2013-01-01", periods=1440, freq="30min")
    data = {
        "LCLid": ["MAC000001"] * 1440,
        "timestamp": timestamps,
        "KWH/hh": [0.5] * 1440,
    }
    df = pd.DataFrame(data)
    records = normalize_london_smartmeter(df)

    assert len(records) == 1
    rec = records[0]
    assert rec.dataset_source == "london_smartmeter"
    assert rec.entity_id == "MAC000001"
    assert rec.usage_kwh == 720.0
    assert rec.domain == WattWiseDomain.PUBLIC_RESIDENTIAL
    assert rec.measurement_method == MeasurementMethod.SMART_METER
    assert rec.dataset_provenance == DatasetProvenance.PUBLIC
    assert rec.coverage_ratio == 1.0
