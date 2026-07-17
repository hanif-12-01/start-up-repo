from __future__ import annotations

import shutil
import time
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
import torch
from lightning.pytorch import Trainer, seed_everything
from lightning.pytorch.callbacks import EarlyStopping, ModelCheckpoint
from pytorch_forecasting import DeepAR, NBeats, TimeSeriesDataSet
from pytorch_forecasting.metrics import MAE, NormalDistributionLoss

from wattwise_benchmark.config import sha256_file
from wattwise_benchmark.models.base import FitSummary, model_fingerprint
from wattwise_benchmark.models.deep_data import make_training_dataset, sequence_frame


class DeepForecastAdapter:
    model_version = "pytorch-forecasting-1.8.0"

    def __init__(
        self,
        model_key: str,
        seed: int,
        artifact_dir: Path,
        *,
        smoke: bool = False,
        max_steps: int = 100,
    ) -> None:
        if model_key not in {"nbeats", "deepar"}:
            raise ValueError("unknown deep model")
        self.model_key = model_key
        self.seed = seed
        self.artifact_dir = artifact_dir
        self.smoke = smoke
        self.max_steps = max_steps
        self.model: NBeats | DeepAR | None = None
        self.training_dataset: TimeSeriesDataSet | None = None
        self.best_checkpoint: Path | None = None
        self.fit_summary: FitSummary | None = None

    def _model_from_dataset(self, dataset: TimeSeriesDataSet) -> NBeats | DeepAR:
        if self.model_key == "nbeats":
            return NBeats.from_dataset(
                dataset,
                learning_rate=0.01,
                stack_types=["generic", "generic"],
                num_blocks=[1, 1],
                num_block_layers=[2, 2],
                widths=[32, 32],
                sharing=[False, False],
                expansion_coefficient_lengths=[16, 16],
                dropout=0.1,
                loss=MAE(),
                log_interval=-1,
            )
        return DeepAR.from_dataset(
            dataset,
            learning_rate=0.001,
            hidden_size=16,
            rnn_layers=1,
            dropout=0.1,
            loss=NormalDistributionLoss(),
            log_interval=-1,
            reduce_on_plateau_patience=3,
        )

    def fit(self, train: pd.DataFrame, validation: pd.DataFrame) -> FitSummary:
        start = time.perf_counter()
        seed_everything(self.seed, workers=True, verbose=False)
        torch.use_deterministic_algorithms(True, warn_only=True)
        train_frame = sequence_frame(train, self.model_key)
        validation_frame = sequence_frame(validation, self.model_key)
        if train_frame.empty or validation_frame.empty:
            raise ValueError(f"{self.model_key} has no eligible train/validation windows")
        training_dataset = make_training_dataset(train_frame, self.model_key)
        validation_dataset = TimeSeriesDataSet.from_dataset(
            training_dataset,
            validation_frame,
            predict=True,
            stop_randomization=True,
        )
        batch_size = 32 if self.smoke else 128
        train_loader = training_dataset.to_dataloader(
            train=True,
            batch_size=batch_size,
            num_workers=0,
        )
        validation_loader = validation_dataset.to_dataloader(
            train=False,
            batch_size=batch_size,
            num_workers=0,
        )
        checkpoint_dir = self.artifact_dir / "checkpoints" / self.model_key / str(self.seed)
        checkpoint_dir.mkdir(parents=True, exist_ok=True)
        checkpoint = ModelCheckpoint(
            dirpath=checkpoint_dir,
            filename=f"{self.model_key}-{self.seed}-best",
            monitor="val_loss",
            mode="min",
            save_top_k=1,
        )
        callbacks: list[Any] = [checkpoint]
        if self.max_steps > 10:
            callbacks.append(EarlyStopping(monitor="val_loss", patience=3, mode="min"))
        trainer = Trainer(
            accelerator="cpu",
            devices=1,
            deterministic=True,
            max_steps=self.max_steps,
            max_epochs=-1,
            callbacks=callbacks,
            logger=False,
            enable_progress_bar=False,
            enable_model_summary=False,
            log_every_n_steps=1,
            default_root_dir=self.artifact_dir,
            val_check_interval=min(self.max_steps, 50),
        )
        model = self._model_from_dataset(training_dataset)
        trainer.fit(model, train_dataloaders=train_loader, val_dataloaders=validation_loader)
        if checkpoint.best_model_path:
            model_class = NBeats if self.model_key == "nbeats" else DeepAR
            self.model = model_class.load_from_checkpoint(checkpoint.best_model_path)
        else:
            self.model = model
        self.training_dataset = training_dataset
        self.best_checkpoint = (
            Path(checkpoint.best_model_path) if checkpoint.best_model_path else None
        )
        score = checkpoint.best_model_score
        val_loss = float(score) if score is not None else float("nan")
        params: dict[str, Any] = {
            "max_steps": self.max_steps,
            "context_min": 6,
            "context_max": 12,
            "batch_size": batch_size,
            "best_validation_loss": val_loss,
            "cpu_only": True,
        }
        fingerprint = model_fingerprint(self.model_key, self.model_version, self.seed, params)
        self.fit_summary = FitSummary(
            model_key=self.model_key,
            model_version=self.model_version,
            seed=self.seed,
            training_duration=time.perf_counter() - start,
            parameters=params,
            artifact_fingerprint=fingerprint,
        )
        return self.fit_summary

    def predict_frame(self, examples: pd.DataFrame) -> pd.DataFrame:
        if self.model is None or self.training_dataset is None:
            raise RuntimeError("model is not fitted")
        frame = sequence_frame(examples, self.model_key)
        dataset = TimeSeriesDataSet.from_dataset(
            self.training_dataset,
            frame,
            predict=True,
            stop_randomization=True,
        )
        kwargs = {
            "data": dataset,
            "return_index": True,
            "batch_size": 128,
            "num_workers": 0,
            "trainer_kwargs": {
                "accelerator": "cpu",
                "devices": 1,
                "logger": False,
                "enable_progress_bar": False,
            },
        }
        if self.model_key == "deepar":
            prediction = self.model.predict(
                mode="quantiles",
                mode_kwargs={"quantiles": [0.025, 0.10, 0.50, 0.90, 0.975]},
                **kwargs,
            )
            values = prediction.output.detach().cpu().numpy()[:, 0, :]
            result = pd.DataFrame(
                {
                    "example_id": prediction.index["series_key"].astype(str),
                    "prediction_kwh": np.maximum(0.0, values[:, 2]),
                    "lower_80": np.maximum(0.0, values[:, 1]),
                    "upper_80": np.maximum(0.0, values[:, 3]),
                    "lower_95": np.maximum(0.0, values[:, 0]),
                    "upper_95": np.maximum(0.0, values[:, 4]),
                }
            )
            return result
        prediction = self.model.predict(mode="prediction", **kwargs)
        values = prediction.output.detach().cpu().numpy().reshape(-1)
        return pd.DataFrame(
            {
                "example_id": prediction.index["series_key"].astype(str),
                "prediction_kwh": np.maximum(0.0, values),
                "lower_80": np.nan,
                "upper_80": np.nan,
                "lower_95": np.nan,
                "upper_95": np.nan,
            }
        )

    def save(self, path: Path) -> str:
        path.parent.mkdir(parents=True, exist_ok=True)
        if self.best_checkpoint is not None:
            shutil.copy2(self.best_checkpoint, path)
        elif self.model is not None:
            torch.save(self.model.state_dict(), path)
        else:
            raise RuntimeError("model is not fitted")
        return sha256_file(path)
