from __future__ import annotations

import numpy as np


def deterministic_forecast(history: list[float]) -> float | None:
    if not history:
        return None
    values = np.asarray(history, dtype=float)
    if not np.isfinite(values).all():
        raise ValueError("deterministic history must be finite")
    count = len(values)
    if count == 1:
        prediction = float(values[0])
    elif count == 2:
        prediction = float((2.0 * values[1]) - values[0])
    else:
        wma_window = values[-3:]
        weights = np.arange(1, len(wma_window) + 1, dtype=float)
        weighted_average = float(np.dot(wma_window, weights) / weights.sum())
        trend_window = values[-6:]
        x = np.arange(len(trend_window), dtype=float)
        slope, intercept = np.polyfit(x, trend_window, 1)
        trend = float(intercept + slope * len(trend_window))
        prediction = 0.75 * trend + 0.25 * weighted_average
    return round(max(0.0, prediction), 2)
