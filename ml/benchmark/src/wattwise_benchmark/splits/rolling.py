from __future__ import annotations

import hashlib
import math

import pandas as pd


def _score(seed: int, source: str, entity: str) -> str:
    return hashlib.sha256(f"{seed}|{source}|{entity}".encode()).hexdigest()


def make_entity_split(examples: pd.DataFrame, seed: int) -> pd.DataFrame:
    rows: list[dict[str, str]] = []
    entities = examples[["dataset_source", "entity_id"]].drop_duplicates()
    for source, group in entities.groupby("dataset_source", sort=True):
        ordered = sorted(
            group["entity_id"].astype(str).tolist(),
            key=lambda entity: _score(seed, str(source), entity),
        )
        count = len(ordered)
        if count < 7:
            raise ValueError(f"source {source} has too few entities for 70/15/15 splitting")
        train_count = max(1, math.floor(count * 0.70))
        validation_count = max(1, math.floor(count * 0.15))
        if train_count + validation_count >= count:
            validation_count = 1
            train_count = count - 2
        for index, entity in enumerate(ordered):
            fold = (
                "train"
                if index < train_count
                else "validation"
                if index < train_count + validation_count
                else "test"
            )
            rows.append({"dataset_source": str(source), "entity_id": entity, "entity_fold": fold})
    result = pd.DataFrame(rows)
    if result.duplicated(["dataset_source", "entity_id"]).any():
        raise ValueError("entity split uniqueness failed")
    return result


def _temporal_fold_map(source_examples: pd.DataFrame) -> dict[pd.Timestamp, str]:
    periods = sorted(pd.to_datetime(source_examples["target_period"]).unique())
    count = len(periods)
    if count < 7:
        raise ValueError("at least seven target periods are required for temporal splitting")
    train_end = max(1, math.floor(count * 0.70))
    validation_end = max(train_end + 1, math.floor(count * 0.85))
    validation_end = min(validation_end, count - 1)
    mapping: dict[pd.Timestamp, str] = {}
    for index, period in enumerate(periods):
        mapping[pd.Timestamp(period)] = (
            "train" if index < train_end else "validation" if index < validation_end else "test"
        )
    return mapping


def assign_seen_entity_track(examples: pd.DataFrame) -> pd.DataFrame:
    pieces: list[pd.DataFrame] = []
    for _, source in examples.groupby("dataset_source", sort=True):
        mapping = _temporal_fold_map(source)
        part = source.copy()
        part["fold"] = pd.to_datetime(part["target_period"]).map(mapping)
        part["track"] = "seen_entity"
        pieces.append(part)
    result = pd.concat(pieces, ignore_index=True)
    validate_split_isolation(result, require_entity_isolation=False)
    return result


def assign_unseen_entity_track(
    examples: pd.DataFrame,
    entity_split: pd.DataFrame,
) -> pd.DataFrame:
    merged = examples.merge(
        entity_split,
        on=["dataset_source", "entity_id"],
        how="left",
        validate="many_to_one",
    )
    pieces: list[pd.DataFrame] = []
    for _, source in merged.groupby("dataset_source", sort=True):
        mapping = _temporal_fold_map(source)
        temporal = pd.to_datetime(source["target_period"]).map(mapping)
        keep = temporal.eq(source["entity_fold"])
        part = source.loc[keep].copy()
        part["fold"] = part.pop("entity_fold")
        part["track"] = "unseen_entity"
        pieces.append(part)
    result = pd.concat(pieces, ignore_index=True)
    validate_split_isolation(result, require_entity_isolation=True)
    return result


def validate_split_isolation(
    split: pd.DataFrame,
    *,
    require_entity_isolation: bool,
) -> None:
    if split["fold"].isna().any():
        raise ValueError("split contains an unassigned fold")
    for source, group in split.groupby("dataset_source"):
        periods = {
            fold: pd.to_datetime(rows["target_period"]) for fold, rows in group.groupby("fold")
        }
        if set(periods) != {"train", "validation", "test"}:
            raise ValueError(f"source {source} is missing a split fold")
        if not (
            periods["train"].max() < periods["validation"].min()
            and periods["validation"].max() < periods["test"].min()
        ):
            raise ValueError(f"temporal isolation failed for source {source}")
        if require_entity_isolation:
            entity_sets = {
                fold: set(rows["entity_id"].astype(str)) for fold, rows in group.groupby("fold")
            }
            if (
                entity_sets["train"] & entity_sets["validation"]
                or entity_sets["train"] & entity_sets["test"]
                or entity_sets["validation"] & entity_sets["test"]
            ):
                raise ValueError(f"entity isolation failed for source {source}")
