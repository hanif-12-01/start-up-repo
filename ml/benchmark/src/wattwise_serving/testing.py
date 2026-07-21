from __future__ import annotations

from typing import Any

from wattwise_serving.artifacts import ArtifactSpec


class FakeModelLoader:
    """Injectable test loader; never performs network or artifact deserialization."""

    def __init__(self, models: dict[str, Any]) -> None:
        self.models = models
        self.calls: list[str] = []

    def load(self, spec: ArtifactSpec) -> Any:
        self.calls.append(spec.model_key)
        return self.models[spec.model_key]
