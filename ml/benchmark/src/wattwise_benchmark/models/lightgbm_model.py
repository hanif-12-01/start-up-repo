from __future__ import annotations

import time
from pathlib import Path
from typing import Any

import joblib
import lightgbm as lgb
import numpy as np
import pandas as pd

from wattwise_benchmark.config import sha256_file
from wattwise_benchmark.models.base import (
    FitSummary,
    eligible_rows,
    feature_frame,
    model_fingerprint,
)
from wattwise_benchmark.models.sklearn_models import _preprocessor, _wmape


class LightGBMAdapter:
    model_key = "lightgbm"
    model_version = "lightgbm-4.6.0"

    def __init__(self, seed: int, smoke: bool = False) -> None:
        self.seed = seed
        self.smoke = smoke
        self.preprocessor: Any = None
        self.model: lgb.LGBMRegressor | None = None
        self.fit_summary: FitSummary | None = None

    def fit(self, train: pd.DataFrame, validation: pd.DataFrame) -> FitSummary:
        start = time.perf_counter()
        train = train.loc[eligible_rows(self.model_key, train)]
        validation = validation.loc[eligible_rows(self.model_key, validation)]
        if train.empty or validation.empty:
            raise ValueError("LightGBM has no eligible train/validation rows")
        x_train_frame = feature_frame(train)
        x_validation_frame = feature_frame(validation)
        preprocessor = _preprocessor(scale=False)
        x_train = preprocessor.fit_transform(x_train_frame)
        x_validation = preprocessor.transform(x_validation_frame)
        y_train = train["target_usage_kwh"].to_numpy(dtype=float)
        y_validation = validation["target_usage_kwh"].to_numpy(dtype=float)
        estimators = 30 if self.smoke else 500
        candidates = [
            {"num_leaves": 15, "max_depth": 4, "min_child_samples": 30},
            {"num_leaves": 31, "max_depth": 6, "min_child_samples": 50},
        ]
        best_score = float("inf")
        best: lgb.LGBMRegressor | None = None
        best_params: dict[str, Any] = {}
        for params in candidates:
            model = lgb.LGBMRegressor(
                objective="regression_l1",
                n_estimators=estimators,
                learning_rate=0.03,
                reg_alpha=0.1,
                reg_lambda=1.0,
                subsample=0.8,
                subsample_freq=1,
                colsample_bytree=0.8,
                random_state=self.seed,
                deterministic=True,
                force_col_wise=True,
                verbosity=-1,
                n_jobs=-1,
                **params,
            )
            model.fit(
                x_train,
                y_train,
                eval_set=[(x_validation, y_validation)],
                callbacks=[
                    lgb.early_stopping(10 if self.smoke else 30, verbose=False),
                    lgb.log_evaluation(period=0),
                ],
            )
            predicted = np.maximum(0.0, model.predict(x_validation))
            score = _wmape(y_validation, predicted)
            if score < best_score:
                best_score = score
                best = model
                best_params = {
                    **params,
                    "n_estimators_bound": estimators,
                    "best_iteration": int(model.best_iteration_),
                    "validation_wmape": score,
                }
        if best is None:
            raise RuntimeError("LightGBM search produced no model")
        self.preprocessor = preprocessor
        self.model = best
        names = preprocessor.get_feature_names_out()
        importance = {
            name: float(value)
            for name, value in sorted(
                zip(names, best.feature_importances_, strict=True),
                key=lambda item: float(item[1]),
                reverse=True,
            )
        }
        fingerprint = model_fingerprint(self.model_key, self.model_version, self.seed, best_params)
        self.fit_summary = FitSummary(
            model_key=self.model_key,
            model_version=self.model_version,
            seed=self.seed,
            training_duration=time.perf_counter() - start,
            parameters=best_params,
            artifact_fingerprint=fingerprint,
            feature_importance=importance,
        )
        return self.fit_summary

    def predict(self, examples: pd.DataFrame) -> np.ndarray:
        if self.model is None or self.preprocessor is None:
            raise RuntimeError("model is not fitted")
        transformed = self.preprocessor.transform(feature_frame(examples))
        return np.maximum(0.0, self.model.predict(transformed))

    def save(self, path: Path) -> str:
        if self.model is None or self.preprocessor is None:
            raise RuntimeError("model is not fitted")
        path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump({"preprocessor": self.preprocessor, "model": self.model}, path)
        return sha256_file(path)
