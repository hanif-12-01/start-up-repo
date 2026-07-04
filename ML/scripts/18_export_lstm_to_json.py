"""Skrip 18: Export LSTM UMKM (ML/outputs_lstm/lstm_model.keras) ke JSON.

Tujuan: menyediakan bobot layer LSTM + Dense + parameter scaler dalam format
JSON portabel supaya bisa dikonsumsi langsung oleh runtime TypeScript aplikasi
WattWise AI tanpa memuat TensorFlow.js di package.json Next.js.

Alur:
  1. Load metadata JSON (fitur, sequence length, hyperparameters, metrics).
  2. Load model Keras (.keras) — coba tensorflow.keras dulu, fallback ke keras.
  3. Load scaler input & target (joblib -> pickle fallback).
  4. Iterasi layer model, kelompokkan: LSTM (satu-satunya), Dense (satu / lebih).
  5. Validasi shape terhadap ekspektasi (features=10, units=32, dst).
  6. Serialize semua bobot ke JSON dengan struktur konsisten.

Perhatian:
  - Urutan gate Keras LSTM: [input, forget, cell, output].
    kernel shape       = (n_features, 4 * units)
    recurrent_kernel   = (units,      4 * units)
    bias               = (4 * units,)
  - Dense mempertahankan urutan layer sesuai model (hidden Dense sebelum
    output Dense) — TS harus mem-forward berdasarkan array ini.
"""

from __future__ import annotations

import json
import pickle
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

# ── Path ─────────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parents[2]
OUTPUTS_DIR = ROOT / "ML" / "outputs_lstm"

INPUT_MODEL = OUTPUTS_DIR / "lstm_model.keras"
INPUT_METADATA = OUTPUTS_DIR / "lstm_model_metadata.json"
INPUT_FEATURE_SCALER = OUTPUTS_DIR / "feature_scaler.pkl"
INPUT_TARGET_SCALER = OUTPUTS_DIR / "target_scaler.pkl"

OUTPUT_JSON = OUTPUTS_DIR / "lstm_model_export.json"

# ── Konstanta encoding (harus konsisten dengan training) ─────────────
BUSINESS_TYPE_ENCODING = {
    "LAUNDRY": 0,
    "FNB": 1,
    "RETAIL": 2,
    "MANUFACTURE": 3,
    "COLD_STORAGE": 4,
    "OTHER": 6,
}

MODEL_NAME = "WattWise LSTM Prototype"
DEFAULT_MODEL_VERSION = "LSTM UMKM v0.1"
TARGET_NAME = "next_month_usage_kwh"


# ── Loader helpers ───────────────────────────────────────────────────
def load_keras_model(path: Path):
    """Load .keras (Keras 3 native format) — coba tensorflow.keras dulu."""
    errs = []
    try:
        from tensorflow import keras as tfk  # type: ignore
        return tfk.models.load_model(str(path), compile=False)
    except Exception as e:
        errs.append(f"tensorflow.keras: {e!r}")
    try:
        import keras  # type: ignore
        return keras.models.load_model(str(path), compile=False)
    except Exception as e:
        errs.append(f"keras: {e!r}")
    raise RuntimeError(
        "Tidak bisa load .keras via tensorflow.keras maupun keras.\n"
        + "\n".join(errs)
    )


def load_scaler(path: Path):
    """Coba joblib dulu, fallback ke pickle."""
    try:
        import joblib  # type: ignore
        return joblib.load(path)
    except Exception:
        with path.open("rb") as f:
            return pickle.load(f)


def get_scaler_params(scaler, name: str) -> dict:
    """Ambil mean_ + scale_ dari StandardScaler / Pipeline yg berisi scaler."""
    if hasattr(scaler, "mean_") and hasattr(scaler, "scale_"):
        return {
            "mean": scaler.mean_.astype(float).tolist(),
            "scale": scaler.scale_.astype(float).tolist(),
        }
    if hasattr(scaler, "named_steps"):
        for step_name, step in scaler.named_steps.items():
            if hasattr(step, "mean_") and hasattr(step, "scale_"):
                return {
                    "mean": step.mean_.astype(float).tolist(),
                    "scale": step.scale_.astype(float).tolist(),
                }
    raise ValueError(
        f"Scaler '{name}' tidak dikenali (tipe: {type(scaler).__name__})."
        " Harus StandardScaler atau Pipeline yang berisi StandardScaler."
    )


def activation_name(layer) -> str:
    act = getattr(layer, "activation", None)
    if act is None:
        return "linear"
    return getattr(act, "__name__", str(act)) or "linear"


def to_lists(a: np.ndarray):
    """Serialize numpy array ke nested Python list (JSON-safe)."""
    return a.astype(float).tolist()


# ── Main ─────────────────────────────────────────────────────────────
def main() -> None:
    print(f"[18] Root: {ROOT}")

    # 1. Metadata
    if not INPUT_METADATA.exists():
        raise FileNotFoundError(f"Metadata tidak ditemukan: {INPUT_METADATA}")
    with INPUT_METADATA.open("r", encoding="utf-8") as f:
        metadata = json.load(f)
    feature_order = metadata.get("features", [])
    sequence_length = int(metadata.get("sequence_length", 6))
    lstm_units_expected = int(metadata.get("parameters", {}).get("lstm_units", 32))
    dense_units_expected = int(metadata.get("parameters", {}).get("dense_units", 16))
    metrics = metadata.get("metrics_test") or metadata.get("metrics", {})
    model_version = metadata.get("model_version") or DEFAULT_MODEL_VERSION

    print(f"[18] Metadata OK. features={len(feature_order)}, seq={sequence_length},"
          f" lstm_units={lstm_units_expected}, dense_units={dense_units_expected}")

    # 2. Model Keras
    if not INPUT_MODEL.exists():
        raise FileNotFoundError(f"Model tidak ditemukan: {INPUT_MODEL}")
    print(f"[18] Loading Keras model: {INPUT_MODEL.name}")
    model = load_keras_model(INPUT_MODEL)
    print(f"[18] Model loaded. Total layers: {len(model.layers)}")

    # 3. Scalers
    if not INPUT_FEATURE_SCALER.exists():
        raise FileNotFoundError(f"Feature scaler tidak ditemukan: {INPUT_FEATURE_SCALER}")
    if not INPUT_TARGET_SCALER.exists():
        raise FileNotFoundError(f"Target scaler tidak ditemukan: {INPUT_TARGET_SCALER}")
    feature_scaler = load_scaler(INPUT_FEATURE_SCALER)
    target_scaler = load_scaler(INPUT_TARGET_SCALER)
    input_scaler_params = get_scaler_params(feature_scaler, "feature")
    target_scaler_params = get_scaler_params(target_scaler, "target")
    print(f"[18] Scalers OK. input.mean len={len(input_scaler_params['mean'])},"
          f" target.mean len={len(target_scaler_params['mean'])}")

    # 4. Kumpulkan bobot layer
    lstm_layers = []
    dense_layers = []
    skipped = []

    for layer in model.layers:
        cls_name = layer.__class__.__name__
        weights = layer.get_weights()
        if cls_name == "LSTM":
            if len(weights) != 3:
                raise ValueError(
                    f"Layer LSTM '{layer.name}' mengembalikan {len(weights)}"
                    " bobot; ekspektasi 3 (kernel, recurrent_kernel, bias)."
                )
            kernel, recurrent_kernel, bias = weights
            units = int(recurrent_kernel.shape[0])
            lstm_layers.append({
                "name": layer.name,
                "units": units,
                "activation": activation_name(layer),
                "recurrent_activation": (
                    getattr(getattr(layer, "recurrent_activation", None),
                            "__name__", "sigmoid") or "sigmoid"
                ),
                "kernel": to_lists(kernel),
                "kernel_shape": list(kernel.shape),
                "recurrent_kernel": to_lists(recurrent_kernel),
                "recurrent_kernel_shape": list(recurrent_kernel.shape),
                "bias": to_lists(bias),
                "bias_shape": list(bias.shape),
                "gate_order": ["input", "forget", "cell", "output"],
            })
        elif cls_name == "Dense":
            if len(weights) != 2:
                raise ValueError(
                    f"Layer Dense '{layer.name}' mengembalikan {len(weights)}"
                    " bobot; ekspektasi 2 (kernel, bias)."
                )
            kernel, bias = weights
            dense_layers.append({
                "name": layer.name,
                "units": int(kernel.shape[1]),
                "activation": activation_name(layer),
                "kernel": to_lists(kernel),
                "kernel_shape": list(kernel.shape),
                "bias": to_lists(bias),
                "bias_shape": list(bias.shape),
            })
        else:
            skipped.append({"name": layer.name, "type": cls_name})

    if len(lstm_layers) != 1:
        raise ValueError(
            f"Ekspektasi tepat 1 layer LSTM, ditemukan {len(lstm_layers)}."
        )
    if len(dense_layers) < 1:
        raise ValueError(
            "Tidak ada layer Dense — model minimal harus punya 1 Dense output."
        )

    lstm = lstm_layers[0]
    dense_output = dense_layers[-1]  # layer terakhir adalah output ke (None, 1)

    # 5. Validate shapes
    n_features = len(feature_order)
    lstm_units = lstm["units"]

    expected_kernel = [n_features, 4 * lstm_units]
    expected_recurrent = [lstm_units, 4 * lstm_units]
    expected_bias = [4 * lstm_units]
    expected_dense_out_kernel_last = 1  # output (None, 1)

    print("[18] --- Shape validation ---")
    print(f"     LSTM name              : {lstm['name']}")
    print(f"     LSTM kernel shape      : {lstm['kernel_shape']}  (expected {expected_kernel})")
    print(f"     LSTM recurrent shape   : {lstm['recurrent_kernel_shape']}  (expected {expected_recurrent})")
    print(f"     LSTM bias shape        : {lstm['bias_shape']}  (expected {expected_bias})")
    for i, d in enumerate(dense_layers):
        print(f"     Dense[{i}] name         : {d['name']}  (activation={d['activation']}, units={d['units']})")
        print(f"     Dense[{i}] kernel shape : {d['kernel_shape']}")
        print(f"     Dense[{i}] bias shape   : {d['bias_shape']}")
    print(f"     Dense output units     : {dense_output['units']}  (expected {expected_dense_out_kernel_last})")

    problems = []
    if lstm["kernel_shape"] != expected_kernel:
        problems.append(
            f"LSTM kernel shape {lstm['kernel_shape']} != expected {expected_kernel}"
        )
    if lstm["recurrent_kernel_shape"] != expected_recurrent:
        problems.append(
            f"LSTM recurrent shape {lstm['recurrent_kernel_shape']} != expected {expected_recurrent}"
        )
    if lstm["bias_shape"] != expected_bias:
        problems.append(
            f"LSTM bias shape {lstm['bias_shape']} != expected {expected_bias}"
        )
    if dense_output["units"] != expected_dense_out_kernel_last:
        problems.append(
            f"Dense output units {dense_output['units']} != expected {expected_dense_out_kernel_last}"
        )
    if len(input_scaler_params["mean"]) != n_features:
        problems.append(
            f"Input scaler mean length {len(input_scaler_params['mean'])} != n_features {n_features}"
        )
    if len(input_scaler_params["scale"]) != n_features:
        problems.append(
            f"Input scaler scale length {len(input_scaler_params['scale'])} != n_features {n_features}"
        )
    if len(target_scaler_params["mean"]) != 1:
        problems.append(
            f"Target scaler mean length {len(target_scaler_params['mean'])} != 1"
        )

    if problems:
        raise ValueError("Shape validation gagal:\n  - " + "\n  - ".join(problems))
    print("[18] Shape validation OK.")

    if skipped:
        print(f"[18] Layers dilewati (tidak punya bobot / non-inference): {skipped}")

    # 6. Serialize
    payload = {
        "model_name": MODEL_NAME,
        "model_version": model_version,
        "source_model_path": INPUT_MODEL.relative_to(ROOT).as_posix(),
        "exported_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "sequence_length": sequence_length,
        "feature_order": feature_order,
        "target_name": TARGET_NAME,
        "business_type_encoding": BUSINESS_TYPE_ENCODING,
        "input_scaler": input_scaler_params,
        "target_scaler": target_scaler_params,
        "layers": {
            # Bentuk yang paling ergonomis untuk TS: lstm object + dense object
            # (dense = output layer terakhir). Selain itu ekspos dense_layers[]
            # sebagai array yang mempertahankan urutan hidden -> output supaya
            # TS bisa forward-pass sekuen Dense sesuai training.
            "lstm": {
                "units": lstm["units"],
                "activation": lstm["activation"],
                "recurrent_activation": lstm["recurrent_activation"],
                "gate_order": lstm["gate_order"],
                "kernel": lstm["kernel"],
                "kernel_shape": lstm["kernel_shape"],
                "recurrent_kernel": lstm["recurrent_kernel"],
                "recurrent_kernel_shape": lstm["recurrent_kernel_shape"],
                "bias": lstm["bias"],
                "bias_shape": lstm["bias_shape"],
                "name": lstm["name"],
            },
            "dense": {
                "units": dense_output["units"],
                "activation": dense_output["activation"],
                "kernel": dense_output["kernel"],
                "kernel_shape": dense_output["kernel_shape"],
                "bias": dense_output["bias"],
                "bias_shape": dense_output["bias_shape"],
                "name": dense_output["name"],
            },
            "dense_layers": [
                {
                    "units": d["units"],
                    "activation": d["activation"],
                    "kernel": d["kernel"],
                    "kernel_shape": d["kernel_shape"],
                    "bias": d["bias"],
                    "bias_shape": d["bias_shape"],
                    "name": d["name"],
                }
                for d in dense_layers
            ],
        },
        "hyperparameters_source": metadata.get("parameters", {}),
        "metrics": metrics,
        "disclaimer": (
            "Prediksi dan estimasi WattWise AI bersifat perkiraan berdasarkan "
            "data yang dimasukkan pengguna dan bukan tagihan resmi PLN."
        ),
    }

    # 7. Write file
    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_JSON.open("w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
        f.write("\n")

    rel_out = OUTPUT_JSON.relative_to(ROOT).as_posix()
    print(f"[18] Exported -> {rel_out}")
    print(f"[18] File size: {OUTPUT_JSON.stat().st_size:,} bytes")
    print("[18] Siap dikonsumsi runtime TypeScript.")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"[18] ERROR: {e}", file=sys.stderr)
        raise
