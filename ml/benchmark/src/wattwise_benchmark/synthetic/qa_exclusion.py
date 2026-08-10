from __future__ import annotations

from typing import Any

QA_DEMO_ENTITY_PREFIXES = (
    "syn_",
    "demo_",
    "qa_",
    "test_",
    "mock_",
)

QA_DEMO_DATASET_SOURCES = (
    "indonesia_umkm_synthetic",
    "qa_demo_source",
    "synthetic_test",
)


def is_eligible_for_final_evaluation(record: dict[str, Any] | Any) -> bool:
    if hasattr(record, "is_synthetic") and record.is_synthetic:
        return False

    if hasattr(record, "final_evaluation_eligible") and not record.final_evaluation_eligible:
        return False

    entity_id = (
        record.entity_id
        if hasattr(record, "entity_id")
        else record.get("entity_id", "")
    )
    dataset_source = (
        record.dataset_source
        if hasattr(record, "dataset_source")
        else record.get("dataset_source", "")
    )

    if any(entity_id.lower().startswith(prefix) for prefix in QA_DEMO_ENTITY_PREFIXES):
        return False

    if dataset_source.lower() in QA_DEMO_DATASET_SOURCES:
        return False

    return True
