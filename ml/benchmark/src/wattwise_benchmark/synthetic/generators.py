from __future__ import annotations

import math

from wattwise_benchmark.contracts import (
    CanonicalMonthlyRecordV2,
    DatasetProvenance,
    MeasurementMethod,
    WattWiseDomain,
    WattWiseUsageSource,
)

SCENARIO_TYPES = [
    "KOS_STABLE",
    "KOS_SEASONAL",
    "KOS_OCCUPANCY_GROWTH",
    "KOS_ANOMALY_SPIKE",
    "LAUNDRY_STABLE",
    "LAUNDRY_SEASONAL",
    "LAUNDRY_GROWTH",
    "RETAIL_STABLE",
    "RETAIL_HOLIDAY_SPIKE",
    "CULINARY_SEASONAL",
    "TARIFF_CHANGE",
    "METER_DERIVED",
    "MISSING_KWH",
    "ZERO_KWH_VALID",
    "EXTREME_SPIKE",
    "ACTION_PLAN_SUCCESS",
]


def generate_synthetic_scenarios(
    months: int = 12,
    start_year: int = 2025,
    seed: int = 42,
) -> list[CanonicalMonthlyRecordV2]:
    records: list[CanonicalMonthlyRecordV2] = []

    # Scenario 1: Kos Stable (10 rooms, ~450 kWh/mo)
    for m in range(months):
        year = start_year + (m // 12)
        month = (m % 12) + 1
        period = f"{year:04d}-{month:02d}-01"
        usage = 450.0 + 15.0 * math.sin(m * 0.5)
        records.append(
            CanonicalMonthlyRecordV2(
                dataset_source="indonesia_umkm_synthetic",
                entity_id="syn_kos_001",
                period_month=period,
                usage_kwh=round(usage, 2),
                dataset_provenance=DatasetProvenance.SYNTHETIC,
                measurement_method=MeasurementMethod.BILLING,
                wattwise_usage_source=WattWiseUsageSource.USER_ENTERED,
                domain=WattWiseDomain.KOS,
                room_count=10.0,
                occupancy=0.9,
                is_synthetic=True,
                training_eligible=False,
                validation_eligible=False,
                final_evaluation_eligible=False,
                quality_flags=("PASS",),
            )
        )

    # Scenario 2: Laundry Growth (Heavy usage, scaling up)
    for m in range(months):
        year = start_year + (m // 12)
        month = (m % 12) + 1
        period = f"{year:04d}-{month:02d}-01"
        usage = 800.0 + (m * 40.0) + (10.0 * (m % 3))
        records.append(
            CanonicalMonthlyRecordV2(
                dataset_source="indonesia_umkm_synthetic",
                entity_id="syn_laundry_001",
                period_month=period,
                usage_kwh=round(usage, 2),
                dataset_provenance=DatasetProvenance.SYNTHETIC,
                measurement_method=MeasurementMethod.SMART_METER,
                wattwise_usage_source=WattWiseUsageSource.METER_DERIVED,
                domain=WattWiseDomain.LAUNDRY,
                employee_count=4.0,
                is_synthetic=True,
                training_eligible=False,
                validation_eligible=False,
                final_evaluation_eligible=False,
                quality_flags=("PASS",),
            )
        )

    # Scenario 3: Retail Holiday Spike (Ramadan/Idul Fitri peak)
    for m in range(months):
        year = start_year + (m // 12)
        month = (m % 12) + 1
        period = f"{year:04d}-{month:02d}-01"
        # Month 4 (April) peak
        base = 600.0
        spike = 350.0 if month == 4 else 0.0
        usage = base + spike + (5.0 * (m % 4))
        records.append(
            CanonicalMonthlyRecordV2(
                dataset_source="indonesia_umkm_synthetic",
                entity_id="syn_retail_001",
                period_month=period,
                usage_kwh=round(usage, 2),
                dataset_provenance=DatasetProvenance.SYNTHETIC,
                measurement_method=MeasurementMethod.UTILITY_METER,
                wattwise_usage_source=WattWiseUsageSource.USER_ENTERED,
                domain=WattWiseDomain.RETAIL,
                floor_area=75.0,
                is_synthetic=True,
                training_eligible=False,
                validation_eligible=False,
                final_evaluation_eligible=False,
                quality_flags=("PASS", "HOLIDAY_SPIKE") if month == 4 else ("PASS",),
            )
        )

    # Scenario 4: Action Plan Success (Energy efficiency intervention reduces load)
    for m in range(months):
        year = start_year + (m // 12)
        month = (m % 12) + 1
        period = f"{year:04d}-{month:02d}-01"
        # After month 6, AC replacement reduces consumption from 1200 to 900 kWh
        usage = 1200.0 if m < 6 else 900.0 + (10.0 * (m % 2))
        records.append(
            CanonicalMonthlyRecordV2(
                dataset_source="indonesia_umkm_synthetic",
                entity_id="syn_culinary_action_001",
                period_month=period,
                usage_kwh=round(usage, 2),
                dataset_provenance=DatasetProvenance.SYNTHETIC,
                measurement_method=MeasurementMethod.BILLING,
                wattwise_usage_source=WattWiseUsageSource.USER_ENTERED,
                domain=WattWiseDomain.CULINARY,
                floor_area=120.0,
                is_synthetic=True,
                training_eligible=False,
                validation_eligible=False,
                final_evaluation_eligible=False,
                quality_flags=("ACTION_PLAN_SUCCESS",) if m >= 6 else ("PASS",),
            )
        )

    return records
