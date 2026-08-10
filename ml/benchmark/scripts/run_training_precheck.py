from __future__ import annotations

import hashlib
import json

from wattwise_benchmark.config import data_root, stable_json
from wattwise_benchmark.quality.precheck import run_training_precheck


def main() -> None:
    root = data_root()
    result = run_training_precheck(root)
    fingerprint_payload = {
        "selected_dataset_ids": result["selected_dataset_ids"],
        "gates": result["gates"],
        "datasets": {
            key: {
                "parquet_sha256": value["parquet_sha256"],
                "quality_audit_sha256": value["quality_audit_sha256"],
                "logical_dataset_sha256": value["logical_dataset_sha256"],
            }
            for key, value in result["datasets"].items()
        },
    }
    result["release_fingerprint"] = hashlib.sha256(
        stable_json(fingerprint_payload).encode("utf-8")
    ).hexdigest()
    destination = root / "manifests" / "ai-data-mega-audit-01-precheck.json"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(
        json.dumps(result, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(result, indent=2, sort_keys=True))
    if not result["ready_for_ai_01"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
