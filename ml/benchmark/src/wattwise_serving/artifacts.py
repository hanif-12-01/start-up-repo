from __future__ import annotations

import hashlib
import json
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, ClassVar, Protocol

SHA256 = re.compile(r"^[0-9a-f]{64}$")


class ArtifactError(RuntimeError):
    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


@dataclass(frozen=True)
class ArtifactSpec:
    model_key: str
    version: str
    identifier: str
    sha256: str
    path: Path


class ArtifactInventory:
    REQUIRED_MODELS: ClassVar[set[str]] = {"lightgbm", "nbeats"}

    def __init__(self, model_root: Path | None) -> None:
        self.model_root = model_root
        self.specs: dict[str, ArtifactSpec] = {}
        self.error_code: str | None = None
        self.refresh()

    @classmethod
    def from_environment(cls) -> ArtifactInventory:
        value = os.environ.get("WATTWISE_MODEL_ROOT", "").strip()
        return cls(Path(value) if value else None)

    @property
    def ready(self) -> bool:
        return self.error_code is None and set(self.specs) == self.REQUIRED_MODELS

    def refresh(self) -> None:
        self.specs = {}
        self.error_code = None
        if self.model_root is None:
            self.error_code = "MODEL_ROOT_UNCONFIGURED"
            return
        manifest = self.model_root / "serving-manifest.json"
        if not manifest.is_file():
            self.error_code = "MANIFEST_MISSING"
            return
        try:
            data = json.loads(manifest.read_text(encoding="utf-8"))
            self._load_manifest(data)
        except (OSError, ValueError, TypeError, json.JSONDecodeError):
            self.specs = {}
            self.error_code = "MANIFEST_INVALID"

    def _load_manifest(self, data: Any) -> None:
        if not isinstance(data, dict) or set(data) != {"schema_version", "models"}:
            raise ValueError("manifest keys")
        if data["schema_version"] != "1.0" or not isinstance(data["models"], dict):
            raise ValueError("manifest schema")
        if set(data["models"]) != self.REQUIRED_MODELS:
            raise ValueError("required model inventory")
        assert self.model_root is not None
        root = self.model_root.resolve()
        for model_key, raw in data["models"].items():
            if not isinstance(raw, dict) or set(raw) != {"version", "artifact", "sha256"}:
                raise ValueError("model spec")
            if not isinstance(raw["version"], str) or not raw["version"].strip():
                raise ValueError("model version")
            if not isinstance(raw["artifact"], str) or not raw["artifact"].strip():
                raise ValueError("artifact identifier")
            if not isinstance(raw["sha256"], str) or SHA256.fullmatch(raw["sha256"]) is None:
                raise ValueError("artifact checksum")
            relative = Path(raw["artifact"])
            if relative.is_absolute() or ".." in relative.parts:
                raise ValueError("artifact path")
            path = (root / relative).resolve()
            if root not in path.parents or not path.is_file():
                raise ValueError("artifact missing")
            actual = hashlib.sha256(path.read_bytes()).hexdigest()
            if actual != raw["sha256"]:
                raise ValueError("artifact checksum mismatch")
            self.specs[model_key] = ArtifactSpec(
                model_key=model_key,
                version=raw["version"],
                identifier=relative.as_posix(),
                sha256=raw["sha256"],
                path=path,
            )

    def require(self, model_key: str, version: str) -> ArtifactSpec:
        if not self.ready:
            raise ArtifactError(self.error_code or "INVENTORY_NOT_READY")
        spec = self.specs.get(model_key)
        if spec is None:
            raise ArtifactError("MODEL_NOT_IN_INVENTORY")
        if spec.version != version:
            raise ArtifactError("MODEL_VERSION_MISMATCH")
        return spec

    def public_inventory(self) -> list[dict[str, str]]:
        return [
            {
                "model": spec.model_key,
                "version": spec.version,
                "artifact_identifier": spec.identifier,
                "artifact_sha256": spec.sha256,
                "readiness": "ready",
            }
            for spec in sorted(self.specs.values(), key=lambda item: item.model_key)
        ]


class ArtifactLoader(Protocol):
    def load(self, spec: ArtifactSpec) -> Any: ...


class LightGBMArtifactLoader:
    def load(self, spec: ArtifactSpec) -> Any:
        if spec.model_key != "lightgbm":
            raise ArtifactError("LOADER_MODEL_MISMATCH")
        from wattwise_benchmark.recovery import load_artifact

        value, _ = load_artifact("lightgbm", spec.path)
        return value


class NBeatsArtifactLoader:
    def load(self, spec: ArtifactSpec) -> Any:
        if spec.model_key != "nbeats":
            raise ArtifactError("LOADER_MODEL_MISMATCH")
        from wattwise_benchmark.recovery import load_artifact

        value, _ = load_artifact("nbeats", spec.path)
        return value


class QualifiedModelLoader:
    def __init__(self) -> None:
        self.loaders: dict[str, ArtifactLoader] = {
            "lightgbm": LightGBMArtifactLoader(),
            "nbeats": NBeatsArtifactLoader(),
        }

    def load(self, spec: ArtifactSpec) -> Any:
        loader = self.loaders.get(spec.model_key)
        if loader is None:
            raise ArtifactError("MODEL_NOT_SERVABLE")
        return loader.load(spec)
