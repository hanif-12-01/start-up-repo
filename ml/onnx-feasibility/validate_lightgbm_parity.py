"""Validate LightGBM ONNX numerical parity, determinism, performance, and sizing."""

from __future__ import annotations

import json
import math
import time
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import onnxruntime as ort

from wattwise_benchmark.features.build import build_inference_example
from wattwise_benchmark.models.base import feature_frame

MODEL_PATH = Path("D:/WattWiseMLData/models/ai-02/lightgbm/ai02-1.0.0/model.joblib")
ONNX_PATH = Path(".onnx-artifacts/lightgbm-ai02-1.0.0.onnx")
FIXTURES_PATH = Path(__file__).parent / "fixtures" / "lightgbm_fixtures.json"


def validate_lightgbm() -> dict[str, Any]:
    if not ONNX_PATH.exists():
        raise FileNotFoundError(f"ONNX model not found: {ONNX_PATH}. Run export_lightgbm.py first.")

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
    input_name = sess.get_inputs()[0].name

    loaded = joblib.load(MODEL_PATH)
    preprocessor = loaded["preprocessor"]
    lgb_model = loaded["model"]

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
        context = fixture["contextual_features"]

        example = build_inference_example(
            entity_id=f"test:{fixture['fixture_id']}",
            target_period=target_period,
            history=history,
            contextual_features=context,
        )

        transformed = preprocessor.transform(feature_frame(example))
        input_tensor = transformed.astype(np.float64)

        # Original reference prediction
        raw_ref = float(lgb_model.predict(transformed)[0])
        ref_pred = max(0.0, raw_ref)

        # ONNX prediction (measure cold on 1st run, warm on subsequent)
        t_start = time.perf_counter()
        onnx_raw = sess.run(None, {input_name: input_tensor})[0].reshape(-1)[0]
        t_infer = (time.perf_counter() - t_start) * 1000.0
        onnx_pred = max(0.0, float(onnx_raw))

        if index == 0:
            cold_ms = t_infer
        else:
            warm_latencies.append(t_infer)

        # Parity checks
        abs_err = abs(onnx_pred - ref_pred)
        rel_err = abs_err / abs(ref_pred) if abs(ref_pred) > 0 else 0.0
        max_allowed_abs = max(0.01, abs(ref_pred) * 1e-4)

        is_finite = math.isfinite(onnx_pred)
        is_non_neg = onnx_pred >= 0.0
        passed = (abs_err <= max_allowed_abs) and is_finite and is_non_neg

        if passed:
            parity_pass += 1
        if abs_err > max_abs_error:
            max_abs_error = abs_err
        if rel_err > max_rel_error:
            max_rel_error = rel_err

        # Determinism check: 3 repeated runs
        runs = [onnx_pred]
        for _ in range(3):
            rep_raw = sess.run(None, {input_name: input_tensor})[0].reshape(-1)[0]
            runs.append(max(0.0, float(rep_raw)))
        deterministic = all(r == runs[0] for r in runs)
        deterministic_checks.append(deterministic)

        case_results.append(
            {
                "fixture_id": fixture["fixture_id"],
                "pattern": fixture["pattern"],
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
    res = validate_lightgbm()
    print(json.dumps(res, indent=2))
