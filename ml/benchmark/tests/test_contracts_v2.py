from __future__ import annotations

import pytest

from wattwise_benchmark.contracts import (
    CanonicalMonthlyRecordV2,
    DatasetProvenance,
    MeasurementMethod,
    WattWiseDomain,
    WattWiseUsageSource,
)


def test_canonical_monthly_record_v2_creation() -> None:
    rec = CanonicalMonthlyRecordV2(
        dataset_source="bdg2",
        entity_id="bldg_001",
        period_month="2025-01-01",
        usage_kwh=1250.5,
        dataset_provenance=DatasetProvenance.PUBLIC,
        measurement_method=MeasurementMethod.SMART_METER,
        wattwise_usage_source=WattWiseUsageSource.LEGACY_UNKNOWN,
        domain=WattWiseDomain.PUBLIC_COMMERCIAL,
    )
    rec.validate()
    assert rec.schema_version == "2.0"
    assert rec.usage_kwh == 1250.5
    assert rec.dataset_provenance == DatasetProvenance.PUBLIC


def test_canonical_monthly_record_v2_validation_failure() -> None:
    rec = CanonicalMonthlyRecordV2(
        dataset_source="bdg2",
        entity_id="bldg_001",
        period_month="2025-01-01",
        usage_kwh=-10.0,
    )
    with pytest.raises(ValueError, match="usage_kwh cannot be negative"):
        rec.validate()
