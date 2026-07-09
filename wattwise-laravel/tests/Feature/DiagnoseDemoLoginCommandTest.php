<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class DiagnoseDemoLoginCommandTest extends TestCase
{
    use RefreshDatabase;

    private const DEMO_EMAIL = 'demo@wattwise.local';

    public function test_command_reports_missing_demo_user_before_seeding(): void
    {
        $this->artisan('wattwise:diagnose-demo-login')
            ->expectsOutputToContain('does NOT exist')
            ->assertExitCode(0);
    }

    public function test_fix_creates_login_ready_demo_account(): void
    {
        $this->assertDatabaseMissing('users', ['email' => self::DEMO_EMAIL]);

        $this->artisan('wattwise:diagnose-demo-login', ['--fix' => true])
            ->assertExitCode(0);

        $user = User::where('email', self::DEMO_EMAIL)->first();

        $this->assertNotNull($user);
        $this->assertNotNull($user->email_verified_at);
        $this->assertTrue(Hash::check('password', $user->password));
    }

    public function test_command_refuses_to_run_outside_local_or_testing(): void
    {
        $this->app->detectEnvironment(fn () => 'production');

        $this->artisan('wattwise:diagnose-demo-login')
            ->expectsOutputToContain('Refusing to run')
            ->assertExitCode(1);
    }
}
