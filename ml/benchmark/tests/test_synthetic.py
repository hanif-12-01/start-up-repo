from __future__ import annotations

from wattwise_benchmark.synthetic import (
    generate_synthetic_scenarios,
    is_eligible_for_final_evaluation,
)


def test_generate_synthetic_scenarios() -> None:
    records = generate_synthetic_scenarios(months=12)
    assert len(records) > 0
    for rec in records:
        assert rec.is_synthetic is True
        assert rec.dataset_provenance.value == "SYNTHETIC"
        assert rec.training_eligible is False
        assert rec.final_evaluation_eligible is False


def test_qa_exclusion() -> None:
    synthetic_records = generate_synthetic_scenarios(months=1)
    for rec in synthetic_records:
        assert is_eligible_for_final_evaluation(rec) is False

    mock_qa_record = {"dataset_source": "qa_demo_source", "entity_id": "qa_demo_user_01"}
    assert is_eligible_for_final_evaluation(mock_qa_record) is False

    valid_public_record = {"dataset_source": "bdg2", "entity_id": "bldg_100"}
    assert is_eligible_for_final_evaluation(valid_public_record) is True
