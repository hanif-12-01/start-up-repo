# WattWise AI — ONNX Feasibility & Numerical Parity Proof (AI-EMBED-01A)

This directory contains the exact feasibility proof, conversion scripts, test fixtures, contracts, and validation suite demonstrating that the validated WattWise AI-02 champion models (**LightGBM** and **N-BEATS**) can be exported to ONNX format and executed via ONNX Runtime with strict mathematical parity.

---

## 1. Toolchain & Environment

The feasibility study was conducted and verified with the following dependencies (see `requirements.txt`):

- **Python**: `3.13.5`
- **PyTorch**: `2.13.0+cpu`
- **ONNX**: `1.22.0`
- **ONNX Runtime**: `1.27.0`
- **ONNXMLTools**: `1.16.0`
- **SKL2ONNX**: `1.20.0`
- **ONNXScript**: `0.7.1`
- **LightGBM**: `4.6.0`
- **Scikit-Learn**: `1.7.1`
- **NumPy**: `2.3.2`
- **Pandas**: `2.3.1`

---

## 2. Model Source Checksums & Immutability

The exact artifacts evaluated match the production reference checkpoints and feature schema:

| Artifact | Path | Expected SHA256 | Verification Status |
| :--- | :--- | :--- | :--- |
| **LightGBM Champion** | `D:\WattWiseMLData\models\ai-02\lightgbm\ai02-1.0.0\model.joblib` | `85f325153810e2611f6d364c81e7ca6f13948b68feee6f491a3015df3f3cf1c0` | **MATCH (YES)** |
| **N-BEATS Champion** | `D:\WattWiseMLData\models\ai-02\nbeats\ai02-1.0.0\model.ckpt` | `541905740b790d39434774679ce3120338ecdabd3f13a8d95385f1d6272191d6` | **MATCH (YES)** |
| **Feature Schema** | Canonical JSON Contract | `0442358152959f5ea3568c4baf846e0df887d14b692ed734600f6fdb60958fd4` | **MATCH (YES)** |

---

## 3. Architecture & Exporter Design

### LightGBM Pipeline
- **Input Representation**: Preprocessed float64 feature matrix (88 dimensions) generated from 40 numerical features and 5 categorical features by the scikit-learn `ColumnTransformer`.
- **Export Strategy**: Exported via `onnxmltools.convert_lightgbm` with `DoubleTensorType` and target opset 15. The `DoubleTensorType` preserves float64 precision for boundary threshold evaluations (such as cosine transforms and building area splits).
- **Postprocessing**: Clamped to non-negative forecast values ($\max(0.0, y)$).

### N-BEATS Pipeline & Reference Wrapper
- **Underlying Model**: Checkpointed PyTorch Forecasting model comprising 2 generic N-BEATS stacks (2 dense layers per block, width 32, expansion length 16).
- **Wrapper Rationale (`NBeatsInferenceWrapper`)**: PyTorch Forecasting encapsulates inference in PyTorch Lightning trainer harnesses and custom dataset abstractions. `NBeatsInferenceWrapper` isolates the exact trained `net_blocks` into a pure PyTorch `nn.Module`.
- **Mathematical Equivalence**:
  1. Accepts 6 continuous historical monthly kWh values: $y \in \mathbb{R}^{B \times 6}$.
  2. Computes sample mean ($\mu = \text{mean}(y)$) and sample standard deviation with Bessel correction ($\sigma = \text{std}(y, \text{ddof}=1) + \epsilon$).
  3. Standardizes input: $x_{\text{norm}} = (y - \mu) / \sigma$.
  4. Runs forward pass through sequential N-BEATS backcast/forecast blocks.
  5. Denormalizes forecast: $\hat{y} = f \cdot \sigma + \mu$.
  6. Clamps to non-negative forecast: $\max(0.0, \hat{y})$.
- **Export Strategy**: Exported via `torch.onnx.export` with opset 18 and dynamic batch dimension.

---

## 4. Execution & Reproduction Guide

### Quick Run: Full Pipeline
```bash
# Set UTF-8 environment (recommended on Windows)
$env:PYTHONUTF8="1"
$env:PYTHONIOENCODING="utf-8"

# Run master verification runner
py -3.13 ml/onnx-feasibility/run_all_feasibility.py
```

### Individual Step Execution
1. **Export LightGBM to ONNX**:
   ```bash
   py -3.13 ml/onnx-feasibility/export_lightgbm.py
   ```
2. **Validate LightGBM Parity**:
   ```bash
   py -3.13 ml/onnx-feasibility/validate_lightgbm_parity.py
   ```
3. **Export N-BEATS to ONNX (with Section 10 wrapper parity proof)**:
   ```bash
   py -3.13 ml/onnx-feasibility/export_nbeats.py
   ```
4. **Validate N-BEATS Parity**:
   ```bash
   py -3.13 ml/onnx-feasibility/validate_nbeats_parity.py
   ```

---

## 5. Artifact Directory Structure

```
ml/onnx-feasibility/
├── requirements.txt                   # Pinned dependencies for conversion and validation
├── export_lightgbm.py                 # LightGBM -> ONNX conversion script
├── validate_lightgbm_parity.py        # LightGBM parity & latency validator
├── export_nbeats.py                   # N-BEATS pure wrapper + ONNX exporter
├── validate_nbeats_parity.py          # N-BEATS parity & latency validator
├── run_all_feasibility.py             # Master automated feasibility orchestrator
├── lightgbm-input-contract.json       # Machine-readable input/output contract for LightGBM
├── nbeats-input-contract.json         # Machine-readable input/output contract for N-BEATS
├── README.md                          # Reproduction guide and architecture notes
├── fixtures/
│   ├── lightgbm_fixtures.json         # 5 representative test fixtures for LightGBM
│   └── nbeats_fixtures.json           # 6 representative test fixtures for N-BEATS
└── reports/
    └── parity_summary.json            # Machine-readable parity proof metrics
```
