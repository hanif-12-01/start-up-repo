<?php

namespace Tests\Feature;

use App\Models\ElectricityEntry;
use App\Models\User;
use App\Support\DemoAccount;
use Database\Seeders\WattWiseDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class ReleaseHealthEndpointTest extends TestCase
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
        foreach ($this->originalRailwayEnvironment as $variable => $value) {
            $value === false ? putenv($variable) : putenv($variable.'='.$value);
        }

        parent::tearDown();
    }

    public function test_default_up_endpoint_remains_available(): void
    {
        $this->get('/up')->assertOk();
    }

    public function test_release_health_rejects_railway_sqlite(): void
    {
        putenv('RAILWAY_PROJECT_ID=test-project');
        putenv('RAILWAY_ENVIRONMENT_NAME=staging');
        $this->app->detectEnvironment(fn (): string => 'staging');

        $this->getJson('/up/release')
            ->assertServiceUnavailable()
            ->assertExactJson([
                'status' => 'fail',
                'code' => 'RAILWAY_SQLITE_FORBIDDEN',
            ]);
    }

    public function test_release_health_requires_demo_when_enabled(): void
    {
        $this->app->detectEnvironment(fn (): string => 'staging');
        config(['demo.enabled' => true]);

        $this->getJson('/up/release')
            ->assertServiceUnavailable()
            ->assertJson(['code' => 'DEMO_NOT_READY']);
    }

    public function test_release_health_requires_complete_ml_scenarios(): void
    {
        $this->app->detectEnvironment(fn (): string => 'staging');
        config([
            'demo.enabled' => true,
            'demo.ml_validation_enabled' => true,
        ]);
        $this->seed(WattWiseDemoSeeder::class);

        $user = User::query()->where('email', DemoAccount::EMAIL)->firstOrFail();
        $business = $user->businesses()
            ->where('name', DemoAccount::ML_SCENARIOS['h13_plus']['business_name'])
            ->firstOrFail();
        ElectricityEntry::query()->where('business_id', $business->id)->firstOrFail()->delete();

        $this->getJson('/up/release')
            ->assertServiceUnavailable()
            ->assertJson(['code' => 'ML_SCENARIOS_NOT_READY']);
    }

    public function test_release_health_returns_200_when_all_requirements_pass(): void
    {
        $this->app->detectEnvironment(fn (): string => 'staging');
        config([
            'demo.enabled' => true,
            'demo.ml_validation_enabled' => true,
        ]);
        $this->seed(WattWiseDemoSeeder::class);

        $this->getJson('/up/release')
            ->assertOk()
            ->assertExactJson([
                'status' => 'ok',
                'database' => 'ready',
                'demo' => 'ready',
                'ml_validation' => 'ready',
            ]);
    }

    public function test_release_health_with_demo_disabled_does_not_require_demo_user(): void
    {
        $this->assertDatabaseMissing('users', ['email' => DemoAccount::EMAIL]);

        $this->getJson('/up/release')
            ->assertOk()
            ->assertJson([
                'demo' => 'disabled',
                'ml_validation' => 'disabled',
            ]);
    }

    public function test_release_health_never_exposes_connection_or_application_secrets(): void
    {
        $sentinel = 'do-not-expose-sensitive-marker';
        config([
            'database.connections.sqlite.url' => $sentinel,
            'database.connections.sqlite.host' => $sentinel,
            'database.connections.sqlite.username' => $sentinel,
            'database.connections.sqlite.password' => $sentinel,
        ]);

        $content = $this->getJson('/up/release')->assertOk()->getContent();

        $this->assertStringNotContainsString($sentinel, $content);
        $this->assertStringNotContainsString('password', strtolower($content));
        $this->assertStringNotContainsString('username', strtolower($content));
        $this->assertStringNotContainsString('host', strtolower($content));
        $this->assertStringNotContainsString('app_key', strtolower($content));
    }

    public function test_demo_and_internal_routes_are_registered_independently_of_runtime_flags(): void
    {
        config([
            'demo.enabled' => false,
            'demo.ml_validation_enabled' => false,
        ]);

        $this->assertNotNull(app('router')->getRoutes()->getByName('up.demo'));
        $this->assertNotNull(app('router')->getRoutes()->getByName('up.release'));
        $this->assertNotNull(app('router')->getRoutes()->getByName('demo.ml-validation'));

        $this->getJson('/up/demo')->assertServiceUnavailable();
    }
}
