<?php

namespace Tests\Unit;

use App\Support\DatabaseConfiguration;
use PHPUnit\Framework\TestCase;

final class DatabaseConfigurationTest extends TestCase
{
    public function test_explicit_connection_takes_precedence(): void
    {
        $url = 'postgresql://example.invalid/wattwise';

        $this->assertSame('sqlite', DatabaseConfiguration::defaultConnection('sqlite', $url));
    }

    public function test_db_url_postgresql_scheme_infers_pgsql(): void
    {
        $url = DatabaseConfiguration::resolvedUrl(
            'postgres://example.invalid/wattwise',
            'postgresql://fallback.invalid/ignored',
        );

        $this->assertSame('pgsql', DatabaseConfiguration::defaultConnection(null, $url));
        $this->assertSame($url, DatabaseConfiguration::urlForConnection('pgsql', $url));
    }

    public function test_database_url_is_used_when_db_url_is_absent(): void
    {
        $url = DatabaseConfiguration::resolvedUrl(null, 'postgresql://example.invalid/wattwise');

        $this->assertSame('pgsql', DatabaseConfiguration::defaultConnection(null, $url));
    }

    public function test_missing_or_unsupported_url_preserves_sqlite_fallback(): void
    {
        $this->assertSame('sqlite', DatabaseConfiguration::defaultConnection(null, null));
        $this->assertSame(
            'sqlite',
            DatabaseConfiguration::defaultConnection(null, 'https://example.invalid/not-a-database'),
        );
    }

    public function test_malformed_url_is_not_inferred_or_echoed(): void
    {
        $malformed = 'postgres://sensitive-marker@';
        ob_start();
        $connection = DatabaseConfiguration::defaultConnection(null, $malformed);
        $output = (string) ob_get_clean();

        $this->assertSame('sqlite', $connection);
        $this->assertSame('', $output);
    }
}
