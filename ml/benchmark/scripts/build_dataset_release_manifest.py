from __future__ import annotations

import sys
from pathlib import Path

repo_root = Path(__file__).resolve().parent.parent.parent.parent
sys.path.insert(0, str(repo_root / "scripts"))

from build_dataset_release_manifest import main

if __name__ == "__main__":
    main()

6