from __future__ import annotations

import json

from wattwise_benchmark.config import data_root
from wattwise_benchmark.quality.mega_audit import run_data_mega_audit


def main() -> None:
    root = data_root()
    result = run_data_mega_audit(root)
    destination = root / "manifests" / "ai-data-mega-audit-01.json"
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
