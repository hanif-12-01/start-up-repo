<?php

namespace App\Support;

final class DemoAccount
{
    public const EMAIL = 'demo@wattwise.local';

    public const PASSWORD = 'password';

    public const USER_NAME = 'Demo WattWise';

    /**
     * The primary business keeps the original name because demo-login readiness
     * checks and existing smoke tests use it as the fully populated baseline.
     */
    public const BUSINESS_NAME = 'Kos Melati Purwokerto';

    public const SUBSCRIPTION_PLAN = 'PRO_TRIAL';

    public const MIN_ELECTRICITY_ENTRIES = 6;

    public const MIN_REVENUE_ENTRIES = 6;

    public const MIN_APPLIANCES = 10;

    /**
     * One demo account, five businesses, one case for every portfolio phase.
     *
     * expected_model_key intentionally uses the research-portfolio identifiers.
     * The validation page compares these expectations with the models that are
     * actually registered in Laravel, so missing LightGBM/N-BEATS integration is
     * visible rather than silently treated as a successful AI deployment.
     */
    public const ML_SCENARIOS = [
        'h00' => [
            'business_name' => 'ML Demo - Usaha Baru (H00)',
            'business_type' => 'RETAIL',
            'city' => 'Purwokerto',
            'province' => 'Jawa Tengah',
            'history_months' => 0,
            'expected_phase' => 'H00',
            'expected_model_key' => 'lightgbm',
            'expected_model_label' => 'LightGBM',
            'base_usage_kwh' => 360.0,
            'monthly_trend_kwh' => 4.0,
        ],
        'h01_02' => [
            'business_name' => 'ML Demo - Warung 2 Bulan (H01_02)',
            'business_type' => 'FNB',
            'city' => 'Purwokerto',
            'province' => 'Jawa Tengah',
            'history_months' => 2,
            'expected_phase' => 'H01_02',
            'expected_model_key' => 'deterministic',
            'expected_model_label' => 'Deterministic baseline',
            'base_usage_kwh' => 430.0,
            'monthly_trend_kwh' => 12.0,
        ],
        'h03_05' => [
            'business_name' => 'ML Demo - Laundry 5 Bulan (H03_05)',
            'business_type' => 'LAUNDRY',
            'city' => 'Purwokerto',
            'province' => 'Jawa Tengah',
            'history_months' => 5,
            'expected_phase' => 'H03_05',
            'expected_model_key' => 'lightgbm',
            'expected_model_label' => 'LightGBM',
            'base_usage_kwh' => 620.0,
            'monthly_trend_kwh' => 16.0,
        ],
        'h06_12' => [
            'business_name' => self::BUSINESS_NAME,
            'business_type' => 'KOS_PROPERTY',
            'city' => 'Purwokerto',
            'province' => 'Jawa Tengah',
            'history_months' => 6,
            'expected_phase' => 'H06_12',
            'expected_model_key' => 'nbeats',
            'expected_model_label' => 'N-BEATS',
            'base_usage_kwh' => 780.0,
            'monthly_trend_kwh' => 9.0,
        ],
        'h13_plus' => [
            'business_name' => 'ML Demo - Kos 18 Bulan (H13_PLUS)',
            'business_type' => 'KOS_PROPERTY',
            'city' => 'Purwokerto',
            'province' => 'Jawa Tengah',
            'history_months' => 18,
            'expected_phase' => 'H13_PLUS',
            'expected_model_key' => 'nbeats',
            'expected_model_label' => 'N-BEATS',
            'base_usage_kwh' => 920.0,
            'monthly_trend_kwh' => 7.0,
        ],
    ];

    public static function enabled(): bool
    {
        return (bool) config('demo.enabled', false);
    }

    public static function mlValidationEnabled(): bool
    {
        return (bool) config('demo.ml_validation_enabled', false);
    }

    public static function environmentAllowed(): bool
    {
        return app()->environment('local', 'testing', 'staging');
    }

    public static function operationAllowed(): bool
    {
        return self::enabled() && self::environmentAllowed();
    }

    public static function mlValidationOperationAllowed(): bool
    {
        return self::operationAllowed() && self::mlValidationEnabled();
    }
}
