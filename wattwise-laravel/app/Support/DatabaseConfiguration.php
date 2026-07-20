<?php

namespace App\Support;

final class DatabaseConfiguration
{
    public static function resolvedUrl(?string $dbUrl, ?string $databaseUrl): ?string
    {
        return self::filled($dbUrl) ?? self::filled($databaseUrl);
    }

    public static function defaultConnection(?string $explicitConnection, ?string $resolvedUrl): string
    {
        $explicitConnection = self::filled($explicitConnection);

        if ($explicitConnection !== null) {
            return $explicitConnection;
        }

        return self::isPostgresUrl($resolvedUrl) ? 'pgsql' : 'sqlite';
    }

    public static function urlForConnection(string $connection, ?string $resolvedUrl): ?string
    {
        if ($resolvedUrl === null) {
            return null;
        }

        if ($connection === 'pgsql') {
            return self::isPostgresUrl($resolvedUrl) ? $resolvedUrl : null;
        }

        $scheme = @parse_url($resolvedUrl, PHP_URL_SCHEME);
        if (! is_string($scheme)) {
            return null;
        }

        $scheme = strtolower($scheme);
        $supportedSchemes = match ($connection) {
            'mysql' => ['mysql'],
            'mariadb' => ['mariadb'],
            'sqlsrv' => ['sqlsrv'],
            'sqlite' => ['sqlite'],
            default => [],
        };

        return in_array($scheme, $supportedSchemes, true) ? $resolvedUrl : null;
    }

    public static function isPostgresUrl(?string $url): bool
    {
        if ($url === null) {
            return false;
        }

        // Suppress parser warnings because malformed environment values must
        // never be echoed into deployment logs.
        $parts = @parse_url($url);
        if (! is_array($parts)) {
            return false;
        }

        $scheme = strtolower((string) ($parts['scheme'] ?? ''));
        $host = trim((string) ($parts['host'] ?? ''));
        $database = trim((string) ($parts['path'] ?? ''), '/');

        return in_array($scheme, ['postgres', 'postgresql'], true)
            && $host !== ''
            && $database !== '';
    }

    private static function filled(?string $value): ?string
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        return trim($value);
    }
}
