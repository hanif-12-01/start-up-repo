from __future__ import annotations

import hashlib
import json
from pathlib import Path

import pytest

from wattwise_serving.artifacts import (
    ArtifactInventory,
    ArtifactSpec,
    LightGBMArtifactLoader,
    NBeatsArtifactLoader,
)


def write_inventory(root: Path, *, corrupt_checksum: bool = False) -> ArtifactInventory:
    artifacts = {}
    for model, extension in (("lightgbm", "joblib"), ("nbeats", "ckpt")):
        path = root / model / f"17.{extension}"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(f"fake-{model}".encode())
        checksum = hashlib.sha256(path.read_bytes()).hexdigest()
        artifacts[model] = {
            "version": f"{model}-test-v1",
            "artifact": path.relative_to(root).as_posix(),
            "sha256": ("0" * 64) if corrupt_checksum and model == "lightgbm" else checksum,
        }
    (root / "serving-manifest.json").write_text(
        json.dumps({"schema_version": "1.0", "models": artifacts}),
        encoding="utf-8",
    )
    return ArtifactInventory(root)


def test_artifact_checksum_validation(tmp_path: Path) -> None:
    assert write_inventory(tmp_path).ready
    inventory = write_inventory(tmp_path, corrupt_checksum=True)
    assert not inventory.ready
    assert inventory.error_code == "MANIFEST_INVALID"


def test_missing_artifact_is_not_ready(tmp_path: Path) -> None:
    inventory = ArtifactInventory(tmp_path)
    assert not inventory.ready
    assert inventory.error_code == "MANIFEST_MISSING"


@pytest.mark.parametrize(
    ("loader", "model", "suffix"),
    [
        (LightGBMArtifactLoader(), "lightgbm", ".joblib"),
        (NBeatsArtifactLoader(), "nbeats", ".ckpt"),
    ],
)
def test_qualified_loader_adapters_reuse_benchmark_loader(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
    loader: object,
    model: str,
    suffix: str,
) -> None:
    artifact = tmp_path / f"artifact{suffix}"
    artifact.write_bytes(b"fake")
    spec = ArtifactSpec(model, "v1", artifact.name, hashlib.sha256(b"fake").hexdigest(), artifact)
    marker = object()
    calls = []

    def fake_load(model_key: str, path: Path):
        calls.append((model_key, path))
        return marker, {}

    monkeypatch.setattr("wattwise_benchmark.recovery.load_artifact", fake_load)
    assert loader.load(spec) is marker  # type: ignore[attr-defined]
    assert calls == [(model, artifact)]
