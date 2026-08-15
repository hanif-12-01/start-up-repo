"""Validate N-BEATS ONNX numerical parity, determinism, performance, and sizing."""

from __future__ import annotations

import json
import math
import time
from pathlib import Path
from typing import Any

import numpy as np
import onnxruntime as ort
from pytorch_forecasting.models import NBeats

from wattwise_benchmark.features.build import build_inference_example
from wattwise_benchmark.recovery import predict_loaded_artifact

MODEL_PATH = Path("D:/WattWiseMLData/models/ai-02/nbeats/ai02-1.0.0/model.ckpt")
ONNX_PATH = Path(".onnx-artifacts/nbeats-ai02-1.0.0.onnx")
FIXTURES_PATH = Path(__file__).parent / "fixtures" / "nbeats_fixtures.json"


def validate_nbeats() -> dict[str, Any]:
    if not ONNX_PATH.exists():
        raise FileNotFoundError(f"ONNX model not found: {ONNX_PATH}. Run export_nbeats.py first.")

    # Model sizing
    orig_bytes = MODEL_PATH.stat().st_size
    onnx_bytes = ONNX_PATH.stat().st_size
    orig_mb = orig_bytes / (1024 * 1024)
    onnx_mb = onnx_bytes / (1024 * 1024)

    # Measure load time
    t0 = time.perf_counter()
    sess_options = ort.SessionOptions()
    sess = ort.InferenceSession(str(ONNX_PATH), sess_options, providers=["CPUExecutionProvider"])
    load_ms = (time.perf_counter() - t0) * 1000.0

    model = NBeats.load_from_checkpoint(str(MODEL_PATH), map_location="cpu")
    model.eval()

    fixtures_data = json.loads(FIXTURES_PATH.read_text(encoding="utf-8"))["fixtures"]

    parity_cases = len(fixtures_data)
    parity_pass = 0
    max_abs_error = 0.0
    max_rel_error = 0.0
    case_results = []
    deterministic_checks = []

    cold_ms = 0.0
    warm_latencies = []

    for index, fixture in enumerate(fixtures_data):
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

        # Input to ONNX is the last 6 months of historical usage
        input_6m = np.array([history[-6:]], dtype=np.float32)

        # ONNX inference
        t_start = time.perf_counter()
        onnx_raw = sess.run(None, {"history_6m": input_6m})[0].reshape(-1)[0]
        t_infer = (time.perf_counter() - t_start) * 1000.0
        onnx_pred = max(0.0, float(onnx_raw))

        if index == 0:
            cold_ms = t_infer
        else:
            warm_latencies.append(t_infer)

        # Parity check
        abs_err = abs(onnx_pred - ref_pred)
        rel_err = abs_err / abs(ref_pred) if abs(ref_pred) > 0 else 0.0
        max_allowed_abs = max(0.01, abs(ref_pred) * 1e-4)

        is_finite = math.isfinite(onnx_pred)
        is_non_neg = onnx_pred >= 0.0
        allclose_match = np.allclose(onnx_pred, ref_pred, rtol=1e-4, atol=1e-5)
        passed = (abs_err <= max_allowed_abs) and is_finite and is_non_neg and allclose_match

        if passed:
            parity_pass += 1
        if abs_err > max_abs_error:
            max_abs_error = abs_err
        if rel_err > max_rel_error:
            max_rel_error = rel_err

        # Determinism check: 3 repeated runs
        runs = [onnx_pred]
        for _ in range(3):
            rep_raw = sess.run(None, {"history_6m": input_6m})[0].reshape(-1)[0]
            runs.append(max(0.0, float(rep_raw)))
        deterministic = all(r == runs[0] for r in runs)
        deterministic_checks.append(deterministic)

        case_results.append(
            {
                "fixture_id": fixture["fixture_id"],
                "pattern": fixture["pattern"],
                "phase": fixture["reporting_phase"],
                "reference_prediction": ref_pred,
                "onnx_prediction": onnx_pred,
                "abs_error": abs_err,
                "rel_error": rel_err,
                "max_allowed_abs": max_allowed_abs,
                "passed": passed,
                "deterministic": deterministic,
            }
        )

    warm_ms = float(np.mean(warm_latencies)) if warm_latencies else cold_ms
    overall_parity = "PASS" if parity_pass == parity_cases else "FAIL"
    all_deterministic = all(deterministic_checks)

    return {
        "parity_cases": parity_cases,
        "parity_pass": parity_pass,
        "max_abs_error": max_abs_error,
        "max_rel_error": max_rel_error,
        "numerical_parity": overall_parity,
        "deterministic": "YES" if all_deterministic else "NO",
        "original_mb": round(orig_mb, 4),
        "onnx_mb": round(onnx_mb, 4),
        "under_100mb": "YES" if onnx_mb < 100.0 else "NO",
        "load_ms": round(load_ms, 2),
        "cold_ms": round(cold_ms, 3),
        "warm_ms": round(warm_ms, 3),
        "case_results": case_results,
    }


if __name__ == "__main__":
    res = validate_nbeats()
    print(json.dumps(res, indent=2))
