from __future__ import annotations

from copy import deepcopy

import pytest

from tests.test_ai02_shadow_contracts import payload
from wattwise_benchmark.features.build import feature_manifest_fingerprint
from wattwise_serving.ai04_contracts import (
    SHADOW_RESULT_CAN_OVERRIDE_USER_FORECAST,
    ShadowObservation,
    ShadowReplayError,
    assert_pii_free,
)
from wattwise_serving.ai04_replay import real_accuracy_summary
from wattwise_serving.shadow_contracts import ShadowContractError


def observation(months: int = 6, provenance: str = "PUBLIC_PROXY") -> dict[str, object]:
    base = payload(months)
    return {
        "shadow_request_id": base["request_id"],
        "shadow_entity_id": "opaque-e1",
        "data_provenance": provenance,
        "forecast_origin": "2024-05-31T23:59:59Z",
        "target_period": base["target_period"],
        "history": base["history"],
        "contextual_features": base["contextual_features"],
        "feature_schema_sha256": feature_manifest_fingerprint(),
        "actual_kwh": 140.0,
        "replay_purpose": "OPERATIONAL_REPLAY",
    }


def test_historical_replay_excludes_actual_and_future_values() -> None:
    item = ShadowObservation.from_dict(observation())
    inference = item.inference_payload()
    assert "actual_kwh" not in inference
    assert all(point["period_month"] < item.target_period for point in item.history)
    assert SHADOW_RESULT_CAN_OVERRIDE_USER_FORECAST is False


def test_future_duplicate_and_out_of_order_history_are_rejected() -> None:
    for mutation in ("future", "duplicate", "out_of_order"):
        value = deepcopy(observation())
        history = value["history"]
        assert isinstance(history, list)
        if mutation == "future":
            history[-1]["period_month"] = value["target_period"]
        elif mutation == "duplicate":
            history[-1]["period_month"] = history[-2]["period_month"]
        else:
            history[-1], history[-2] = history[-2], history[-1]
        with pytest.raises(ShadowContractError):
            ShadowObservation.from_dict(value)


def test_provenance_is_explicit_and_pii_is_forbidden() -> None:
    for provenance in (
        "REAL_WATTWISE",
        "PUBLIC_PROXY",
        "MODELED_SIMULATION",
        "SYNTHETIC_DEMO",
    ):
        assert (
            ShadowObservation.from_dict(observation(provenance=provenance)).data_provenance
            == provenance
        )
    invalid = observation(provenance="UNDECLARED")
    with pytest.raises(ShadowReplayError, match="Unknown data provenance"):
        ShadowObservation.from_dict(invalid)
    with pytest.raises(ShadowReplayError, match="Forbidden PII fields"):
        assert_pii_free({"email": "not-allowed"})


def test_non_real_and_load_test_records_cannot_enter_real_accuracy() -> None:
    from wattwise_serving.ai04_contracts import ShadowResult

    def result(provenance: str, purpose: str) -> ShadowResult:
        return ShadowResult(
            "r", provenance, "2026-01-01T00:00:00Z", "2026-01", "H06_12",
            "VALID_ELIGIBLE_REQUEST", "nbeats", "v1", "a" * 64, 10.0, 12.0,
            False, None, "worker", 1, 100, 1.0, 2.0, 11.0, True, 1.0, 1.0, purpose,
        )

    summary = real_accuracy_summary(
        [
            result("PUBLIC_PROXY", "OPERATIONAL_REPLAY"),
            result("MODELED_SIMULATION", "OPERATIONAL_REPLAY"),
            result("SYNTHETIC_DEMO", "OPERATIONAL_REPLAY"),
            result("REAL_WATTWISE", "LOAD_TEST_REPLAY"),
        ]
    )
    assert summary["paired_observation_count"] == 0
    assert summary["evidence_tier"] == "NO_REAL_ACCURACY_EVIDENCE"


def test_real_accuracy_tiers_and_bootstrap() -> None:
    from wattwise_serving.ai04_contracts import ShadowResult

    rows = [
        ShadowResult(
            f"r-{index}", "REAL_WATTWISE", "2026-01-01T00:00:00Z", "2026-01",
            "H13_PLUS", "VALID_ELIGIBLE_REQUEST", "nbeats", "v1", "a" * 64,
            100.0 + index, 105.0 + index, False, None, "worker", 1, 100, 1.0, 2.0,
            102.0 + index, True, 2.0, 3.0, "OPERATIONAL_REPLAY",
        )
        for index in range(30)
    ]
    summary = real_accuracy_summary(rows)
    assert summary["evidence_tier"] == "EVALUABLE_BUT_NOT_PROMOTION_GRADE"
    assert summary["bootstrap_samples"] == 1000
    assert len(summary["bootstrap_ci"]) == 2
