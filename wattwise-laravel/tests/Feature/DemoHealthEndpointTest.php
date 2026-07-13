<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\DemoAccount;
use Database\Seeders\WattWiseDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DemoHealthEndpointTest extends TestCase
{
    use RefreshDatabase;

    public function test_up_demo_returns_200_when_demo_ready(): void
    {
        config(['demo.enabled' => true]);
        $this->seed(WattWiseDemoSeeder::class);

        $response = $this->getJson('/up/demo');

        $response->assertOk();
        $response->assertJson([
            'status' => 'ok',
            'demo' => 'ready',
            'reason' => null,
        ]);
    }

    public function test_up_demo_returns_503_when_demo_user_missing(): void
    {
        config(['demo.enabled' => true]);

        $response = $this->getJson('/up/demo');

        $response->assertServiceUnavailable();
        $response->assertJson([
            'status' => 'fail',
            'demo' => 'not_ready',
        ]);
        $response->assertJsonStructure(['status', 'demo', 'reason']);
    }

    public function test_up_demo_returns_503_when_subscription_expired(): void
    {
        config(['demo.enabled' => true]);
        $this->seed(WattWiseDemoSeeder::class);

        $user = User::where('email', DemoAccount::EMAIL)->firstOrFail();
        $sub = $user->subscription;
        $sub->trial_ends_at = now()->subDay();
        $sub->current_period_ends_at = now()->subDay();
        $sub->save();

        $response = $this->getJson('/up/demo');

        $response->assertServiceUnavailable();
        $response->assertJson([
            'status' => 'fail',
            'demo' => 'not_ready',
            'reason' => 'UnusableSubscription',
        ]);
    }

    public function test_up_demo_returns_503_when_demo_disabled(): void
    {
        config(['demo.enabled' => false]);

        $response = $this->getJson('/up/demo');

        $response->assertServiceUnavailable();
        $response->assertJson([
            'status' => 'fail',
            'demo' => 'not_ready',
            'reason' => 'FeatureDisabled',
        ]);
    }
}
