<?php

return [
    'shadow_enabled' => (bool) env('PREDICTION_SHADOW_ENABLED', false),
    'ridge_enabled' => (bool) env('PREDICTION_RIDGE_ENABLED', false),
    'gradient_boosting_enabled' => (bool) env('PREDICTION_GRADIENT_BOOSTING_ENABLED', false),
    'adaptive_router_enabled' => (bool) env('PREDICTION_ADAPTIVE_ROUTER_ENABLED', false),
    'router_mode' => env('PREDICTION_ROUTER_MODE', 'recommendation_only'),
    'router_min_evaluations' => (int) env('PREDICTION_ROUTER_MIN_EVALUATIONS', 12),
    'router_min_businesses' => (int) env('PREDICTION_ROUTER_MIN_BUSINESSES', 3),
    'router_max_failure_rate' => (float) env('PREDICTION_ROUTER_MAX_FAILURE_RATE', 0.05),
];
