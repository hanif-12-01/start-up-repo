<?php

namespace App\Support;

final class RailwayEnvironment
{
    /** @var list<string> */
    private const DETECTION_VARIABLES = [
        'RAILWAY_PROJECT_ID',
        'RAILWAY_ENVIRONMENT_ID',
        'RAILWAY_SERVICE_ID',
        'RAILWAY_DEPLOYMENT_ID',
        'RAILWAY_ENVIRONMENT_NAME',
        'RAILWAY_PUBLIC_DOMAIN',
        'RAILWAY_STATIC_URL',
    ];

    public static function detected(): bool
    {
        foreach (self::DETECTION_VARIABLES as $variable) {
            if (self::value($variable) !== null) {
                return true;
            }
        }

        return false;
    }

    public static function environmentName(): ?string
    {
        $name = self::value('RAILWAY_ENVIRONMENT_NAME');

        return $name === null ? null : strtolower($name);
    }

    public static function isProduction(): bool
    {
        return self::detected()
            && (self::environmentName() === 'production' || app()->environment('production'));
    }

    public static function isStaging(): bool
    {
        return self::detected()
            && ! self::isProduction()
            && (self::environmentName() === 'staging' || app()->environment('staging'));
    }

    public static function isManagedDeployment(): bool
    {
        return self::isProduction() || self::isStaging();
    }

    private static function value(string $key): ?string
    {
        $value = getenv($key);
        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        return trim($value);
    }
}
