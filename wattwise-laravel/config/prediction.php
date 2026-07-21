<?php

return [
    'mode' => strtolower((string) env('PREDICTION_MODE', 'off')),
    'ml_endpoint' => env('PREDICTION_ML_ENDPOINT'),
    'ml_timeout_ms' => (int) env('PREDICTION_ML_TIMEOUT_MS', 1500),
    'lightgbm_enabled' => (bool) env('PREDICTION_LIGHTGBM_ENABLED', false),
    'nbeats_enabled' => (bool) env('PREDICTION_NBEATS_ENABLED', false),
    'ridge_shadow_enabled' => (bool) env('PREDICTION_RIDGE_SHADOW_ENABLED', false),
    'allow_production_ml' => (bool) env('PREDICTION_ALLOW_PRODUCTION_ML', false),
    'production_approved' => (bool) env('PREDICTION_PRODUCTION_APPROVED', false),
    'lightgbm_version' => env('PREDICTION_LIGHTGBM_VERSION'),
    'nbeats_version' => env('PREDICTION_NBEATS_VERSION'),
    'queue_connection' => env('PREDICTION_QUEUE_CONNECTION', 'database'),
    'queue' => env('PREDICTION_QUEUE', 'predictions'),

    // Phase-A shadow settings retained for backwards compatibility.
    'shadow_enabled' => (bool) env('PREDICTION_SHADOW_ENABLED', false),
    'ridge_enabled' => (bool) env('PREDICTION_RIDGE_ENABLED', false),
    'gradient_boosting_enabled' => (bool) env('PREDICTION_GRADIENT_BOOSTING_ENABLED', false),
    'adaptive_router_enabled' => (bool) env('PREDICTION_ADAPTIVE_ROUTER_ENABLED', false),
    'router_mode' => env('PREDICTION_ROUTER_MODE', 'recommendation_only'),
    'router_min_evaluations' => (int) env('PREDICTION_ROUTER_MIN_EVALUATIONS', 12),
    'router_min_businesses' => (int) env('PREDICTION_ROUTER_MIN_BUSINESSES', 3),
    'router_max_failure_rate' => (float) env('PREDICTION_ROUTER_MAX_FAILURE_RATE', 0.05),
];
