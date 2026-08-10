from __future__ import annotations

import json
import os
import sys
from pathlib import Path

# Add ml/benchmark/src to path
repo_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(repo_root / "ml" / "benchmark" / "src"))

from wattwise_benchmark.datasets.evidence import build_dataset_release_evidence


def main() -> None:
    data_root_env = os.environ.get("WATTWISE_ML_DATA_ROOT")
    if not data_root_env:
        raise RuntimeError(
            "WATTWISE_ML_DATA_ROOT environment variable is required for real artifact verification."
        )

    data_root_dir = Path(data_root_env).expanduser().resolve()
    if not data_root_dir.is_dir():
        raise FileNotFoundError(
            f"WATTWISE_ML_DATA_ROOT directory does not exist: {data_root_dir}"
        )

    evidence = build_dataset_release_evidence(data_root=data_root_dir)

    target_manifest_path = (
        repo_root
        / "docs"
        / "ml"
        / "datasets"
        / "AI_DATA_RECOVERY_01_VERIFIED_AUTHORITATIVE_RELEASE.json"
    )
    legacy_manifest_path = (
        repo_root
        / "docs"
        / "ml"
        / "datasets"
        / "AI_DATA_01G_VERIFIED_REAL_DATASET_RELEASE.json"
    )
    target_manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_bytes = json.dumps(evidence, indent=2, sort_keys=True, default=str) + "\n"
    target_manifest_path.write_text(manifest_bytes, encoding="utf-8")
    legacy_manifest_path.write_text(manifest_bytes, encoding="utf-8")
    print(f"Successfully generated verified release manifest at {target_manifest_path}")
    print(f"Dataset Release Fingerprint: {evidence['dataset_release_fingerprint']}")


if __name__ == "__main__":
    main()
