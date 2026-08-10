from __future__ import annotations

import json

from wattwise_benchmark.config import data_root, sha256_file
from wattwise_benchmark.datasets.cohorts import compute_logical_dataset_sha256
from wattwise_benchmark.ingestion.bdg2 import normalize_bdg2
from wattwise_benchmark.ingestion.common import write_normalized


def main() -> None:
    root = data_root()
    electricity = root / "raw" / "bdg2" / "1.0" / "electricity.csv"
    metadata = root / "raw" / "bdg2" / "1.0" / "metadata.csv"
    for source in (electricity, metadata):
        if not source.is_file():
            raise FileNotFoundError(f"Authoritative BDG2 source is missing: {source}")
        if any(token in str(source).lower() for token in ("fixture", "mock", "synthetic")):
            raise ValueError(f"Refusing non-authoritative BDG2 source path: {source}")

    panel, audit = normalize_bdg2(electricity, metadata)
    audit.update(
        {
            "source_identity": (
                "Official buds-lab v1.0 Git LFS objects verified by SHA-256"
            ),
            "electricity_source_sha256": sha256_file(electricity),
            "metadata_source_sha256": sha256_file(metadata),
            "logical_dataset_sha256": compute_logical_dataset_sha256(panel),
        }
    )
    output = write_normalized(panel, audit, root / "normalized" / "bdg2" / "1.0")
    evidence = {**audit, **output}
    destination = root / "manifests" / "bdg2-real-normalization-evidence.json"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(
        json.dumps(evidence, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(evidence, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
