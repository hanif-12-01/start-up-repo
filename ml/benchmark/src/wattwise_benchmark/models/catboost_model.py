from __future__ import annotations

import time
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from catboost import CatBoostRegressor

from wattwise_benchmark.config import sha256_file
from wattwise_benchmark.features import CATEGORICAL_FEATURES
from wattwise_benchmark.models.base import (
    FitSummary,
    eligible_rows,
    feature_frame,
    model_fingerprint,
)
from wattwise_benchmark.models.sklearn_models import _wmape


class CatBoostAdapter:
    model_key = "catboost"
    model_version = "catboost-1.2.8"

    def __init__(self, seed: int, smoke: bool = False) -> None:
        self.seed = seed
        self.smoke = smoke
        self.model: CatBoostRegressor | None = None
        self.fit_summary: FitSummary | None = None

    def fit(self, train: pd.DataFrame, validation: pd.DataFrame) -> FitSummary:
        start = time.perf_counter()
        train = train.loc[eligible_rows(self.model_key, train)]
        validation = validation.loc[eligible_rows(self.model_key, validation)]
        if train.empty or validation.empty:
            raise ValueError("CatBoost has no eligible train/validation rows")
        x_train = feature_frame(train)
        x_validation = feature_frame(validation)
        y_train = train["target_usage_kwh"].to_numpy(dtype=float)
        y_validation = validation["target_usage_kwh"].to_numpy(dtype=float)
        iterations = 20 if self.smoke else 400
        candidates = [
            {"depth": 4, "learning_rate": 0.05, "l2_leaf_reg": 5.0},
            {"depth": 6, "learning_rate": 0.03, "l2_leaf_reg": 10.0},
        ]
        best_score = float("inf")
        best: CatBoostRegressor | None = None
        best_params: dict[str, Any] = {}
        for params in candidates:
            model = CatBoostRegressor(
                iterations=iterations,
                loss_function="RMSE",
                random_seed=self.seed,
                random_strength=0.0,
                bootstrap_type="Bernoulli",
                subsample=0.8,
                allow_writing_files=False,
                verbose=False,
                thread_count=-1,
                **params,
            )
            model.fit(
                x_train,
                y_train,
                cat_features=CATEGORICAL_FEATURES,
                eval_set=(x_validation, y_validation),
                early_stopping_rounds=10 if self.smoke else 30,
                verbose=False,
            )
            predicted = np.maximum(0.0, model.predict(x_validation))
            score = _wmape(y_validation, predicted)
            if score < best_score:
                best_score = score
                best = model
                best_params = {
                    **params,
                    "iterations_bound": iterations,
                    "best_iteration": int(model.get_best_iteration()),
                    "validation_wmape": score,
                }
        if best is None:
            raise RuntimeError("CatBoost search produced no model")
        self.model = best
        importance = {
            name: float(value)
            for name, value in sorted(
                zip(x_train.columns, best.get_feature_importance(), strict=True),
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
        if self.model is None:
            raise RuntimeError("model is not fitted")
        return np.maximum(0.0, self.model.predict(feature_frame(examples)))

    def save(self, path: Path) -> str:
        if self.model is None:
            raise RuntimeError("model is not fitted")
        path.parent.mkdir(parents=True, exist_ok=True)
        self.model.save_model(path)
        return sha256_file(path)
