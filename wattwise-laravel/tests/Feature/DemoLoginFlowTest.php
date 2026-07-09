<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\WattWiseDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * End-to-end proof that the seeded demo account can log in through the
 * real Fortify login route and reach the seeded dashboard.
 *
 * This guards the exact scenario a demo user performs at localhost and
 * catches regressions where the seeder stops producing a login-ready
 * account (wrong hash, missing email verification, etc.).
 */
class DemoLoginFlowTest extends TestCase
{
    use RefreshDatabase;

    private const DEMO_EMAIL = 'demo@wattwise.local';

    private const DEMO_PASSWORD = 'password';

    public function test_seeded_demo_account_can_log_in_and_reach_dashboard(): void
    {
        $this->seed(WattWiseDemoSeeder::class);

        $response = $this->post(route('login.store'), [
            'email' => self::DEMO_EMAIL,
            'password' => self::DEMO_PASSWORD,
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('dashboard', absolute: false));

        // Follow through to the dashboard to prove the verified middleware
        // does not block the demo account and the page renders.
        $this->get(route('dashboard'))->assertOk();
    }

    public function test_seeded_demo_account_is_verified_and_password_matches(): void
    {
        $this->seed(WattWiseDemoSeeder::class);

        $user = User::where('email', self::DEMO_EMAIL)->firstOrFail();

        $this->assertNotNull(
            $user->email_verified_at,
            'Demo user should be email-verified so login is not blocked if verification is enforced.'
        );
        $this->assertTrue(
            Hash::check(self::DEMO_PASSWORD, $user->password),
            'Demo user password must match the documented demo password.'
        );
    }

    public function test_demo_account_cannot_log_in_with_wrong_password(): void
    {
        $this->seed(WattWiseDemoSeeder::class);

        $this->post(route('login.store'), [
            'email' => self::DEMO_EMAIL,
            'password' => 'not-the-password',
        ]);

        $this->assertGuest();
    }
}
