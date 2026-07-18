<?php

namespace Tests\Feature;

use App\Services\Deployment\DatabaseRuntimeContext;
use App\Services\Deployment\DatabaseRuntimeProbe;
use App\Support\DemoAccount;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class RailwayReleaseGuardTest extends TestCase
{
    use RefreshDatabase;

    /** @var array<string, string|false> */
    private array $originalRailwayEnvironment = [];

    /** @var list<string> */
    private array $railwayVariables = [
        'RAILWAY_PROJECT_ID',
        'RAILWAY_ENVIRONMENT_ID',
        'RAILWAY_SERVICE_ID',
        'RAILWAY_DEPLOYMENT_ID',
        'RAILWAY_ENVIRONMENT_NAME',
        'RAILWAY_PUBLIC_DOMAIN',
        'RAILWAY_STATIC_URL',
    ];

    protected function setUp(): void
    {
        parent::setUp();

        foreach ($this->railwayVariables as $variable) {
            $this->originalRailwayEnvironment[$variable] = getenv($variable);
            putenv($variable);
        }

        config([
            'demo.enabled' => false,
            'demo.ml_validation_enabled' => false,
        ]);
    }

    protected function tearDown(): void
    {
        config(['database.default' => 'sqlite']);
        DB::setDefaultConnection('sqlite');
        DB::purge('pgsql');
        DB::purge('broken');

        foreach ($this->originalRailwayEnvironment as $variable => $value) {
            $value === false ? putenv($variable) : putenv($variable.'='.$value);
        }

        parent::tearDown();
    }

    public function test_railway_staging_with_sqlite_fails(): void
    {
        $this->railway('staging');
        $this->app->detectEnvironment(fn (): string => 'staging');

        $this->artisan('wattwise:railway-release-guard')
            ->expectsOutputToContain('RAILWAY_SQLITE_FORBIDDEN')
            ->assertFailed();
    }

    public function test_railway_production_with_sqlite_fails(): void
    {
        $this->railway('production');
        $this->app->detectEnvironment(fn (): string => 'production');

        $this->artisan('wattwise:railway-release-guard')
            ->expectsOutputToContain('RAILWAY_SQLITE_FORBIDDEN')
            ->assertFailed();
    }

    public function test_railway_managed_environment_requires_postgresql(): void
    {
        $this->mockDatabase('mysql', 'wattwise');
        $this->railway('staging');
        $this->app->detectEnvironment(fn (): string => 'staging');

        $this->artisan('wattwise:railway-release-guard')
            ->expectsOutputToContain('RAILWAY_POSTGRES_REQUIRED')
            ->assertFailed();
    }

    public function test_railway_production_rejects_demo_flag_with_pgsql_selected(): void
    {
        $this->mockConnectedPgsql();
        $this->railway('production');
        $this->app->detectEnvironment(fn (): string => 'production');
        config(['demo.enabled' => true]);

        $this->artisan('wattwise:railway-release-guard')
            ->expectsOutputToContain('RAILWAY_PRODUCTION_DEMO_FORBIDDEN')
            ->assertFailed();
    }

    public function test_railway_production_rejects_ml_validation_flag_with_pgsql_selected(): void
    {
        $this->mockConnectedPgsql();
        $this->railway('production');
        $this->app->detectEnvironment(fn (): string => 'production');
        config(['demo.ml_validation_enabled' => true]);

        $this->artisan('wattwise:railway-release-guard')
            ->expectsOutputToContain('RAILWAY_PRODUCTION_ML_VALIDATION_FORBIDDEN')
            ->assertFailed();
    }

    public function test_railway_production_with_demo_disabled_and_pgsql_passes(): void
    {
        $this->mockConnectedPgsql();
        $this->railway('production');
        $this->app->detectEnvironment(fn (): string => 'production');

        $this->artisan('wattwise:railway-release-guard')
            ->expectsOutputToContain('Release guard: passed')
            ->assertSuccessful();
    }

    public function test_demo_disabled_staging_performs_no_demo_mutation(): void
    {
        $this->app->detectEnvironment(fn (): string => 'staging');

        $this->artisan('wattwise:railway-release-guard')->assertSuccessful();

        $this->assertDatabaseMissing('users', ['email' => DemoAccount::EMAIL]);
    }

    public function test_database_connection_failure_returns_non_zero_without_exception_details(): void
    {
        config([
            'database.default' => 'broken',
            'database.connections.broken' => [
                'driver' => 'sqlite',
                'database' => base_path('database/missing-release-guard.sqlite'),
                'prefix' => '',
            ],
        ]);
        DB::purge('broken');

        $this->artisan('wattwise:railway-release-guard')
            ->expectsOutputToContain('DATABASE_UNAVAILABLE')
            ->assertFailed();
    }

    public function test_non_railway_staging_provisions_a_missing_demo_user(): void
    {
        $this->app->detectEnvironment(fn (): string => 'staging');
        config(['demo.enabled' => true]);

        $this->artisan('wattwise:railway-release-guard')
            ->expectsOutputToContain('PROVISIONED')
            ->assertSuccessful();

        $this->assertDatabaseHas('users', ['email' => DemoAccount::EMAIL]);
    }

    public function test_release_guard_output_never_contains_configured_connection_secrets(): void
    {
        $sentinel = 'do-not-expose-sensitive-marker';
        $this->mockConnectedPgsql();
        config([
            'database.connections.pgsql.url' => 'postgresql://'.$sentinel.'@example.invalid/wattwise',
            'database.connections.pgsql.host' => $sentinel,
            'database.connections.pgsql.username' => $sentinel,
            'database.connections.pgsql.password' => $sentinel,
        ]);

        $this->assertSame(0, Artisan::call('wattwise:railway-release-guard'));
        $output = Artisan::output();
        $this->assertStringNotContainsString($sentinel, $output);
        $this->assertStringNotContainsString('postgresql://', $output);
    }

    private function railway(string $environment): void
    {
        putenv('RAILWAY_PROJECT_ID=test-project');
        putenv('RAILWAY_ENVIRONMENT_NAME='.$environment);
    }

    private function mockConnectedPgsql(): void
    {
        $this->mockDatabase('pgsql', 'postgres');
    }

    private function mockDatabase(string $driver, string $database): void
    {
        $this->mock(DatabaseRuntimeProbe::class, function ($mock) use ($driver, $database): void {
            $mock->shouldReceive('probe')
                ->andReturn(new DatabaseRuntimeContext($driver, $database));
        });
    }
}
