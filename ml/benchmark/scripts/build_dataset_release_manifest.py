from __future__ import annotations

import json
from pathlib import Path

from wattwise_benchmark.datasets.evidence import build_dataset_release_evidence


def main() -> None:
    repo_root = Path(__file__).resolve().parent.parent.parent.parent
    manifest_path = repo_root / "docs" / "ml" / "datasets" / "AI_DATA_01D_DATASET_RELEASE_MANIFEST.json"

    evidence = build_dataset_release_evidence()
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(
        json.dumps(evidence, indent=2, sort_keys=True, default=str) + "\n",
        encoding="utf-8",
    )
    print(f"Successfully generated release manifest at {manifest_path}")
    print(f"Dataset Release Fingerprint: {evidence['dataset_release_fingerprint']}")


if __name__ == "__main__":
    main()
