from __future__ import annotations

import hashlib
import json
import os
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

DATA_ROOT_ALIAS = "${WATTWISE_ML_DATA_ROOT}"


@dataclass(frozen=True)
class BenchmarkConfig:
    stage: str = "smoke"
    completeness_threshold: float = 0.90
    entity_seed: int = 20260715
    model_seeds: tuple[int, ...] = (17, 29, 43)
    smoke_entities_per_source: int = 12
    max_tabular_searches: int = 8
    neural_max_steps_smoke: int = 5
    neural_max_steps_full: int = 100
    neural_context_months: int = 6
    failure_rate_gate: float = 0.05

    def validate(self) -> None:
        if self.stage not in {"smoke", "full"}:
            raise ValueError("stage must be smoke or full")
        if not 0.0 < self.completeness_threshold <= 1.0:
            raise ValueError("completeness_threshold must be in (0, 1]")
        if not self.model_seeds:
            raise ValueError("at least one random seed is required")

    def fingerprint(self) -> str:
        payload = json.dumps(asdict(self), sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(payload.encode()).hexdigest()


def data_root() -> Path:
    value = os.environ.get("WATTWISE_ML_DATA_ROOT")
    if not value:
        raise RuntimeError("WATTWISE_ML_DATA_ROOT is required")
    root = Path(value).expanduser().resolve()
    if not root.is_absolute():
        raise RuntimeError("WATTWISE_ML_DATA_ROOT must resolve to an absolute path")
    return root


def aliased_path(path: Path, root: Path | None = None) -> str:
    resolved_root = (root or data_root()).resolve()
    relative = path.resolve().relative_to(resolved_root)
    return f"{DATA_ROOT_ALIAS}/{relative.as_posix()}"


def sha256_file(path: Path, chunk_size: int = 1024 * 1024) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(chunk_size), b""):
            digest.update(chunk)
    return digest.hexdigest()


def stable_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), default=str)
