"""Inference-only regression: checkpoint, corrected wrapper, original and candidate CPU.

Run with benchmark/src on PYTHONPATH; --candidate and --output must be explicit.
No export, training, activation or tolerance overrides.
"""
from __future__ import annotations

import argparse
import importlib.metadata
import json
from pathlib import Path

import numpy as np
import onnxruntime as ort
import pandas as pd
import torch

from export_nbeats import (
    EXPECTED_SHA256, FIXTURES_PATH, MODEL_PATH, NBeatsInferenceWrapper, sha256_file,
)
from wattwise_benchmark.features.build import build_inference_example
from wattwise_benchmark.recovery import load_artifact, predict_loaded_artifact

RTOL, ATOL = 1e-5, 1e-6  # Frozen historical audit tolerances, before candidate export.
ORIGINAL_SHA256 = "33eef1bca1008eb06bd687772c994371b00d443d763a35de51d60e760fe21988"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--candidate", type=Path, required=True)
    parser.add_argument("--original", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists():
        raise FileExistsError(args.output)
    assert sha256_file(MODEL_PATH) == EXPECTED_SHA256
    assert sha256_file(args.original) == ORIGINAL_SHA256
    assert args.candidate.resolve() != args.original.resolve()
    fixtures = json.loads(FIXTURES_PATH.read_text(encoding="utf8"))["fixtures"]
    cases = [(f["fixture_id"], f["history"][-6:]) for f in fixtures]
    cases += [
        ("zero", [0.] * 6),
        ("near_zero", [1e-6, 2e-6, 3e-6, 1e-6, 0., 1e-6]),
        ("constant_small", [.1] * 6),
        ("low_variable", [0., .1, .2, .3, .4, .5]),
        ("unit_variable", [0., 1., 2., 3., 4., 5.]),
        ("constant", [100.] * 6),
        ("outlier", [1., 1., 1., 1., 1., 10000.]),
        ("large", [1e6, 1.1e6, .9e6, 1e6, 1.2e6, 1e6]),
    ]
    assert len(cases) == 14
    cases += [
        ("epsilon", [0., 1e-10, 1e-8, 1e-7, 1e-6, 1e-5]),
        ("subnormal", [0., 1e-45, 1e-40, 1e-35, 1e-30, 1e-25]),
        ("constant_zero_adjacent", [1e-8] * 6),
        ("constant_one", [1.] * 6),
        ("threshold20", [19.9, 19.99, 20., 20.000002, 20.01, 20.1]),
        ("descending_small", [.5, .4, .3, .2, .1, 0.]),
        ("alternating_zero", [0., 1., 0., 1., 0., 1.]),
        ("zero_tail", [100., 10., 1., 0., 0., 0.]),
        ("zero_head", [0., 0., 0., 1., 10., 100.]),
        ("near_constant_large", [1e8, 1e8, 1e8+8, 1e8, 1e8-8, 1e8]),
        ("large_dynamic_range", [0., 1e-8, .1, 20., 1e4, 1e9]),
        ("very_large", [1e12, 1.1e12, .9e12, 1e12, 1.2e12, 1e12]),
    ]
    rng = np.random.default_rng(20261104)
    cases += [(f"seeded_{i:02d}", (rng.random(6)*10.**power).tolist())
              for i, power in enumerate(np.linspace(-8, 9, 24))]
    arrays = [np.asarray([h], dtype=np.float32) for _, h in cases]
    assert all(np.isfinite(x).all() and (x >= 0).all() for x in arrays)
    examples = pd.concat([
        build_inference_example(
            entity_id=f"parity:{name}", target_period="2026-01-01",
            history=x[0].astype(float).tolist(), contextual_features={
                "dataset_source": "wattwise_application", "business_type": "FNB",
                "building_primary_use": None, "building_area": None,
                "site": None, "timezone": None, "profile_eligible": False,
            },
        ) for (name, _), x in zip(cases, arrays)
    ], ignore_index=True)
    model, metadata = load_artifact("nbeats", MODEL_PATH)
    references = predict_loaded_artifact("nbeats", model, examples).set_index("example_id")
    wrapper = NBeatsInferenceWrapper(model.net_blocks).eval()
    candidate = ort.InferenceSession(str(args.candidate), providers=["CPUExecutionProvider"])
    original = ort.InferenceSession(str(args.original), providers=["CPUExecutionProvider"])
    records = []
    for (name, _), x, example_id in zip(cases, arrays, examples["example_id"]):
        reference = float(references.loc[example_id, "prediction_kwh"])
        with torch.inference_mode():
            wrapped = float(wrapper(torch.from_numpy(x))[0, 0])
        prediction = candidate.run(["prediction_kwh"], {"history_6m": x})[0]
        assert prediction.dtype == np.float32 and prediction.shape == (1, 1)
        cpu = float(prediction[0, 0])
        old = float(original.run(None, {"history_6m": x})[0][0, 0])
        valid = bool(np.isfinite([reference, wrapped, cpu]).all() and min(reference, wrapped, cpu) >= 0)
        matches = {label: bool(np.isclose(a, b, rtol=RTOL, atol=ATOL)) for label, a, b in [
            ("reference_wrapper", wrapped, reference), ("reference_onnx", cpu, reference),
            ("wrapper_onnx", cpu, wrapped), ("original_reference", old, reference),
        ]}
        records.append(dict(case=name, history_float32=x[0].astype(float).tolist(),
                            reference=reference, wrapper=wrapped, onnx=cpu, original=old,
                            abs_error=abs(cpu-reference), valid=valid, **matches,
                            passed=valid and all(matches[k] for k in ["reference_wrapper", "reference_onnx", "wrapper_onnx"])))
    report = dict(status="PASS" if all(r["passed"] for r in records) else "FAIL",
                  rtol=RTOL, atol=ATOL, cases=records, checkpoint_metadata=metadata,
                  hashes={str(p): sha256_file(p) for p in [MODEL_PATH, args.original, args.candidate]},
                  versions={p: importlib.metadata.version(p) for p in ["torch", "pytorch-forecasting", "lightning", "onnx", "onnxruntime", "numpy"]},
                  training_invoked=False, export_invoked=False)
    args.output.write_text(json.dumps(report, indent=2, allow_nan=False)+"\n", encoding="utf8")
    for record in records:
        print(json.dumps(record), flush=True)
    assert report["status"] == "PASS", "Candidate parity failed; see JSON, no tolerance relaxation"
    assert sha256_file(MODEL_PATH) == EXPECTED_SHA256
    assert sha256_file(args.original) == ORIGINAL_SHA256


if __name__ == "__main__":
    main()
