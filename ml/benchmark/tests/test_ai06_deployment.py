from __future__ import annotations

import hashlib
import os
from pathlib import Path

import pytest

from wattwise_serving.ai05_service import NBEATS_SHA256, application_from_environment


def test_ai06_artifact_authority_mismatch_fails_before_worker_start(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("WATTWISE_MODEL_ARTIFACT_SHA256", "0" * 64)
    monkeypatch.setenv("WATTWISE_AI_SERVICE_TOKEN", "synthetic-test-token")
    with pytest.raises(RuntimeError, match="NBEATS_ARTIFACT_AUTHORITY_MISMATCH"):
        application_from_environment()


def test_ai06_real_artifact_checksum_matches_frozen_authority() -> None:
    root = os.environ.get("WATTWISE_ML_DATA_ROOT")
    if not root:
        pytest.skip("WATTWISE_ML_DATA_ROOT required")
    artifact = Path(root) / "models" / "ai-02" / "nbeats" / "ai02-1.0.0" / "model.ckpt"
    assert hashlib.sha256(artifact.read_bytes()).hexdigest() == NBEATS_SHA256


def test_ai06_container_does_not_copy_artifacts_or_run_as_root() -> None:
    dockerfile = Path("ml/benchmark/deploy/ai06/Dockerfile").read_text(encoding="utf-8")
    assert "USER wattwise:wattwise" in dockerfile
    assert "model.ckpt" not in dockerfile
    assert "WATTWISE_AI_SERVICE_TOKEN=" not in dockerfile
    assert "/health/ready" in dockerfile
    assert "LD_LIBRARY_PATH=/usr/local/lib/python3.13/site-packages/torch/lib" in dockerfile
