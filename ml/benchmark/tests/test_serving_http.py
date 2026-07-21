from __future__ import annotations

from tests.test_serving_artifacts import write_inventory
from tests.test_serving_contracts import payload
from wattwise_serving.artifacts import ArtifactInventory
from wattwise_serving.http_server import InferenceApplication
from wattwise_serving.runtime import InferenceRuntime


def test_missing_artifacts_keep_service_not_ready(tmp_path) -> None:
    inventory = ArtifactInventory(tmp_path)
    application = InferenceApplication(inventory, InferenceRuntime(inventory))

    status, body = application.health()
    assert status == 503
    assert body["status"] == "not_ready"
    assert "model_root" not in body


def test_model_inventory_contains_identifiers_not_local_root(tmp_path) -> None:
    inventory = write_inventory(tmp_path)
    application = InferenceApplication(inventory, InferenceRuntime(inventory))

    status, body = application.models()
    assert status == 200
    assert len(body["models"]) == 2
    serialized = str(body)
    assert str(tmp_path) not in serialized


def test_malformed_input_returns_structured_error(tmp_path) -> None:
    inventory = write_inventory(tmp_path)
    application = InferenceApplication(inventory, InferenceRuntime(inventory))
    data = payload()
    del data["requested_model"]

    status, body = application.predict(data)
    assert status == 422
    assert body == {
        "schema_version": "1.0",
        "status": "error",
        "error_code": "INVALID_REQUEST_KEYS",
    }
