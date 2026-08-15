"""Export validated LightGBM champion to ONNX."""

from __future__ import annotations

import hashlib
from pathlib import Path

import joblib
import onnx
import onnxmltools
from onnxmltools.convert.common.data_types import DoubleTensorType

EXPECTED_SHA256 = "85f325153810e2611f6d364c81e7ca6f13948b68feee6f491a3015df3f3cf1c0"
MODEL_PATH = Path("D:/WattWiseMLData/models/ai-02/lightgbm/ai02-1.0.0/model.joblib")
OUTPUT_DIR = Path(".onnx-artifacts")
OUTPUT_FILE = OUTPUT_DIR / "lightgbm-ai02-1.0.0.onnx"


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def export_lightgbm() -> Path:
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model file not found: {MODEL_PATH}")

    actual_hash = sha256_file(MODEL_PATH)
    if actual_hash != EXPECTED_SHA256:
        raise ValueError(
            f"Hash mismatch for LightGBM model. Expected: {EXPECTED_SHA256}, got: {actual_hash}"
        )
    print(f"[OK] LightGBM source artifact SHA256 verified: {actual_hash}")

    loaded = joblib.load(MODEL_PATH)
    model = loaded["model"]
    preprocessor = loaded["preprocessor"]

    feature_count = int(preprocessor.get_feature_names_out().size)
    print(f"Loaded LightGBM model with {feature_count} preprocessed features.")

    # Using DoubleTensorType ensures exact float64 threshold comparison parity with LightGBM booster
    initial_types = [("input", DoubleTensorType([None, feature_count]))]
    onnx_model = onnxmltools.convert_lightgbm(
        model.booster_,
        initial_types=initial_types,
        target_opset=15,
    )

    onnx.checker.check_model(onnx_model)
    print("[OK] LightGBM onnx.checker.check_model passed.")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    onnx.save_model(onnx_model, str(OUTPUT_FILE))
    print(f"[OK] Saved LightGBM ONNX model to {OUTPUT_FILE} ({OUTPUT_FILE.stat().st_size / 1024 / 1024:.3f} MB)")

    return OUTPUT_FILE


if __name__ == "__main__":
    export_lightgbm()
