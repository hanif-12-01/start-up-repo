from __future__ import annotations

import re

from wattwise_benchmark.datasets.evidence import build_dataset_release_evidence

HEX64_PATTERN = re.compile(r"^[0-9a-f]{64}$")


def test_build_dataset_release_evidence_programmatic() -> None:
    evidence = build_dataset_release_evidence()
    assert evidence["schema_version"] == "2.0"
    assert "dataset_release_fingerprint" in evidence
    assert HEX64_PATTERN.match(evidence["dataset_release_fingerprint"])

    datasets = evidence["datasets"]
    assert set(datasets.keys()) == {"uci_eld", "bdg2", "london_smartmeter", "nrel_comstock"}

    for ds_id, meta in datasets.items():
        assert meta["dataset_id"] == ds_id
        assert HEX64_PATTERN.match(meta["logical_dataset_sha256"])
        assert meta["normalized_entity_count"] > 0
        assert meta["normalized_entity_month_count"] > 0

    cohorts = evidence["cohorts"]
    assert "MEASURED_BASELINE" in cohorts
    assert "MEASURED_PUBLIC" in cohorts
    assert "ALL_PUBLIC_RESEARCH" in cohorts
