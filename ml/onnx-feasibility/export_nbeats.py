"""Export validated N-BEATS champion to ONNX with mathematical reference proof."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

import numpy as np
import onnx
import torch
from pytorch_forecasting.models import NBeats

from wattwise_benchmark.features.build import build_inference_example
from wattwise_benchmark.recovery import predict_loaded_artifact

EXPECTED_SHA256 = "541905740b790d39434774679ce3120338ecdabd3f13a8d95385f1d6272191d6"
MODEL_PATH = Path("D:/WattWiseMLData/models/ai-02/nbeats/ai02-1.0.0/model.ckpt")
FIXTURES_PATH = Path(__file__).parent / "fixtures" / "nbeats_fixtures.json"
OUTPUT_DIR = Path(".onnx-artifacts")
OUTPUT_FILE = OUTPUT_DIR / "nbeats-ai02-1.0.0.onnx"


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


class NBeatsInferenceWrapper(torch.nn.Module):
    """
    Pure PyTorch inference wrapper around the exact loaded N-BEATS network blocks.

    Preserves exact mathematical transformations from PyTorch Forecasting:
    - Input: Sequence of last 6 continuous monthly usage values (kWh)
    - Sequence-wise standard normalization (mean & sample std with ddof=1)
    - Forward pass through the exact loaded net_blocks
    - Inverse affine normalization using sequence center & scale
    - Non-negative prediction clamp: max(0.0, y)
    """

    def __init__(self, net_blocks: torch.nn.ModuleList) -> None:
        super().__init__()
        self.net_blocks = net_blocks

    def forward(self, y: torch.Tensor) -> torch.Tensor:
        # y: [batch_size, 6] in kWh
        eps = 1.1920928955078125e-07

        # Standard scaling: center = mean, scale = sample standard deviation (ddof=1)
        center = y.mean(dim=-1, keepdim=True)
        scale = y.std(dim=-1, keepdim=True, correction=1) + eps

        # Normalized input to N-BEATS blocks
        x_norm = (y - center) / scale

        # Forward pass through net_blocks
        backcast = x_norm
        forecast = torch.zeros((x_norm.shape[0], 1), dtype=torch.float32, device=x_norm.device)
        for block in self.net_blocks:
            backcast_block, forecast_block = block(backcast)
            backcast = backcast - backcast_block
            forecast = forecast + forecast_block

        # Denormalize output
        y_pred = forecast * scale + center

        # Non-negative output constraint
        prediction = torch.clamp(y_pred, min=0.0)
        return prediction


def export_nbeats() -> tuple[Path, dict[str, Any]]:
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model file not found: {MODEL_PATH}")

    actual_hash = sha256_file(MODEL_PATH)
    if actual_hash != EXPECTED_SHA256:
        raise ValueError(
            f"Hash mismatch for N-BEATS model. Expected: {EXPECTED_SHA256}, got: {actual_hash}"
        )
    print(f"[OK] N-BEATS source artifact SHA256 verified: {actual_hash}")

    model = NBeats.load_from_checkpoint(str(MODEL_PATH), map_location="cpu")
    model.eval()
    print("[OK] Loaded N-BEATS checkpoint in eval mode.")

    wrapper = NBeatsInferenceWrapper(model.net_blocks)
    wrapper.eval()

    # Verify wrapper parity against reference wattwise_serving / recovery implementation
    print("\n--- Running Section 10: Reference Proof Before ONNX Export ---")
    fixtures_data = json.loads(FIXTURES_PATH.read_text(encoding="utf-8"))["fixtures"]
    wrapper_parity_records = []
    all_wrapper_passed = True

    for fixture in fixtures_data:
        history = fixture["history"]
        target_period = fixture["target_period"]
        example = build_inference_example(
            entity_id=f"test:{fixture['fixture_id']}",
            target_period=target_period,
            history=history,
            contextual_features={
                "dataset_source": "wattwise_application",
                "building_primary_use": None,
                "business_type": "FNB",
                "building_area": None,
                "site": None,
                "timezone": None,
                "profile_eligible": False,
            },
        )
        ref_pred_df = predict_loaded_artifact("nbeats", model, example)
        ref_pred = float(ref_pred_df.iloc[0]["prediction_kwh"])

        # Wrapper input is the last 6 months of history
        input_6m = torch.tensor([history[-6:]], dtype=torch.float32)
        with torch.no_grad():
            wrapper_pred_tensor = wrapper(input_6m)
            wrapper_pred = float(wrapper_pred_tensor[0, 0].item())

        abs_err = abs(wrapper_pred - ref_pred)
        rel_err = abs_err / abs(ref_pred) if abs(ref_pred) > 0 else 0.0
        max_allowed_abs = max(0.001, abs(ref_pred) * 1e-5)
        passed = abs_err <= max_allowed_abs and np.allclose(
            wrapper_pred, ref_pred, rtol=1e-5, atol=1e-6
        )

        if not passed:
            all_wrapper_passed = False

        record = {
            "fixture_id": fixture["fixture_id"],
            "pattern": fixture["pattern"],
            "phase": fixture["reporting_phase"],
            "reference_prediction": ref_pred,
            "wrapper_prediction": wrapper_pred,
            "abs_error": abs_err,
            "rel_error": rel_err,
            "passed": passed,
        }
        wrapper_parity_records.append(record)
        status_str = "PASS" if passed else "FAIL"
        print(
            f"  Fixture {fixture['fixture_id']} ({fixture['pattern']}): "
            f"Ref={ref_pred:.4f} kWh, Wrapper={wrapper_pred:.4f} kWh, "
            f"AbsErr={abs_err:.2e}, Status={status_str}"
        )

    if not all_wrapper_passed:
        raise RuntimeError("NBEATS_WRAPPER_PARITY check FAILED. Export aborted.")
    print("[OK] Section 10 NBEATS_WRAPPER_PARITY: PASS for all fixtures.\n")

    # Export to ONNX
    print("--- Running Section 11: N-BEATS -> ONNX Export ---")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    dummy_input = torch.tensor([[100.0, 110.0, 120.0, 130.0, 140.0, 150.0]], dtype=torch.float32)

    torch.onnx.export(
        wrapper,
        dummy_input,
        str(OUTPUT_FILE),
        export_params=True,
        opset_version=17,
        do_constant_folding=True,
        input_names=["history_6m"],
        output_names=["prediction_kwh"],
        dynamic_axes={
            "history_6m": {0: "batch_size"},
            "prediction_kwh": {0: "batch_size"},
        },
        dynamo=False,
    )
    print(f"[OK] Exported N-BEATS ONNX model to {OUTPUT_FILE}")

    onnx_model = onnx.load(str(OUTPUT_FILE))
    onnx.checker.check_model(onnx_model)
    print("[OK] N-BEATS onnx.checker.check_model passed.")
    print(f"[OK] Model size: {OUTPUT_FILE.stat().st_size / 1024 / 1024:.3f} MB")

    return OUTPUT_FILE, {
        "wrapper_parity_records": wrapper_parity_records,
        "all_wrapper_passed": all_wrapper_passed,
    }


if __name__ == "__main__":
    export_nbeats()
