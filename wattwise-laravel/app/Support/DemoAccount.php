<?php

namespace App\Support;

final class DemoAccount
{
    public const EMAIL = 'demo@wattwise.local';

    public const PASSWORD = 'password';

    public const USER_NAME = 'Demo WattWise';

    public const BUSINESS_NAME = 'Kos Melati Purwokerto';

    public const SUBSCRIPTION_PLAN = 'PRO_TRIAL';

    public const MIN_ELECTRICITY_ENTRIES = 6;

    public const MIN_REVENUE_ENTRIES = 6;

    public const MIN_APPLIANCES = 10;

    public static function enabled(): bool
    {
        return (bool) config('demo.enabled', false);
    }

    public static function environmentAllowed(): bool
    {
        return app()->environment('local', 'testing', 'staging');
    }

    public static function operationAllowed(): bool
    {
        return self::enabled() && self::environmentAllowed();
    }
}
