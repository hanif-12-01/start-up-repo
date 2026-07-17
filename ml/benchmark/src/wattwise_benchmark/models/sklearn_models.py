from __future__ import annotations

import time
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import Ridge
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from wattwise_benchmark.config import sha256_file
from wattwise_benchmark.features import CATEGORICAL_FEATURES, NUMERIC_FEATURES
from wattwise_benchmark.models.base import (
    FitSummary,
    eligible_rows,
    feature_frame,
    model_fingerprint,
)


def _wmape(actual: np.ndarray, predicted: np.ndarray) -> float:
    denominator = float(np.abs(actual).sum())
    return float(np.abs(actual - predicted).sum() / denominator) if denominator else float("inf")


def _preprocessor(scale: bool) -> ColumnTransformer:
    numeric_steps: list[tuple[str, Any]] = [
        ("imputer", SimpleImputer(strategy="median", keep_empty_features=True))
    ]
    if scale:
        numeric_steps.append(("scale", StandardScaler()))
    return ColumnTransformer(
        [
            ("numeric", Pipeline(numeric_steps), NUMERIC_FEATURES),
            (
                "categorical",
                Pipeline(
                    [
                        (
                            "imputer",
                            SimpleImputer(
                                strategy="constant",
                                fill_value="__MISSING__",
                                keep_empty_features=True,
                            ),
                        ),
                        (
                            "one_hot",
                            OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                        ),
                    ]
                ),
                CATEGORICAL_FEATURES,
            ),
        ],
        verbose_feature_names_out=True,
    )


class SklearnAdapter:
    def __init__(self, family: str, seed: int) -> None:
        if family not in {"ridge", "gradient_boosting"}:
            raise ValueError("unknown sklearn family")
        self.family = family
        self.seed = seed
        self.model_key = family
        self.model_version = "sklearn-1.7.1"
        self.pipeline: Pipeline | None = None
        self.fit_summary: FitSummary | None = None

    def _candidates(self) -> list[tuple[dict[str, Any], Any]]:
        if self.family == "ridge":
            return [
                (
                    {"alpha": alpha},
                    Ridge(alpha=alpha, random_state=self.seed),
                )
                for alpha in (0.1, 1.0, 10.0, 100.0)
            ]
        configs = [
            {
                "n_estimators": 100,
                "max_depth": 2,
                "learning_rate": 0.05,
                "min_samples_leaf": 10,
                "ccp_alpha": 0.0,
            },
            {
                "n_estimators": 200,
                "max_depth": 2,
                "learning_rate": 0.03,
                "min_samples_leaf": 20,
                "ccp_alpha": 0.0,
            },
            {
                "n_estimators": 150,
                "max_depth": 3,
                "learning_rate": 0.03,
                "min_samples_leaf": 20,
                "ccp_alpha": 0.001,
            },
            {
                "n_estimators": 100,
                "max_depth": 3,
                "learning_rate": 0.05,
                "min_samples_leaf": 30,
                "ccp_alpha": 0.001,
            },
        ]
        return [
            (
                config,
                GradientBoostingRegressor(random_state=self.seed, **config),
            )
            for config in configs
        ]

    def fit(self, train: pd.DataFrame, validation: pd.DataFrame) -> FitSummary:
        start = time.perf_counter()
        train_mask = eligible_rows(self.model_key, train)
        validation_mask = eligible_rows(self.model_key, validation)
        train_eligible = train.loc[train_mask]
        validation_eligible = validation.loc[validation_mask]
        if train_eligible.empty or validation_eligible.empty:
            raise ValueError(f"{self.model_key} has no eligible train/validation rows")
        x_train = feature_frame(train_eligible)
        y_train = train_eligible["target_usage_kwh"].to_numpy(dtype=float)
        x_validation = feature_frame(validation_eligible)
        y_validation = validation_eligible["target_usage_kwh"].to_numpy(dtype=float)
        best_score = float("inf")
        best_pipeline: Pipeline | None = None
        best_params: dict[str, Any] = {}
        for params, estimator in self._candidates():
            pipeline = Pipeline(
                [
                    ("preprocess", _preprocessor(scale=self.family == "ridge")),
                    ("model", estimator),
                ]
            )
            pipeline.fit(x_train, y_train)
            predicted = np.maximum(0.0, pipeline.predict(x_validation))
            score = _wmape(y_validation, predicted)
            if score < best_score:
                best_score = score
                best_pipeline = pipeline
                best_params = {**params, "validation_wmape": score}
        if best_pipeline is None:
            raise RuntimeError(f"{self.model_key} search produced no model")
        self.pipeline = best_pipeline
        preprocess = self.pipeline.named_steps["preprocess"]
        names = list(preprocess.get_feature_names_out())
        estimator = self.pipeline.named_steps["model"]
        importance_values = (
            np.abs(estimator.coef_) if self.family == "ridge" else estimator.feature_importances_
        )
        importance = {
            name: float(value)
            for name, value in sorted(
                zip(names, importance_values, strict=True),
                key=lambda item: abs(float(item[1])),
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
        if self.pipeline is None:
            raise RuntimeError("model is not fitted")
        return np.maximum(0.0, self.pipeline.predict(feature_frame(examples)))

    def save(self, path: Path) -> str:
        if self.pipeline is None:
            raise RuntimeError("model is not fitted")
        path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.pipeline, path)
        return sha256_file(path)
