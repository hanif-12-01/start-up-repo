<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\DemoAccount;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Testing\PendingCommand;
use Tests\TestCase;

class DiagnoseDemoLoginCommandTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['demo.enabled' => true]);
        $this->app->detectEnvironment(fn (): string => 'testing');
    }

    public function test_command_reports_missing_demo_user_before_seeding_and_fails(): void
    {
        /** @var PendingCommand $command */
        $command = $this->artisan('wattwise:diagnose-demo-login');
        $command->expectsOutputToContain('does NOT exist');
        $exitCode = $command->run();
        $this->assertEquals(1, $exitCode);
    }

    public function test_fix_creates_login_ready_demo_account_and_succeeds(): void
    {
        $this->assertDatabaseMissing('users', ['email' => DemoAccount::EMAIL]);

        /** @var PendingCommand $command */
        $command = $this->artisan('wattwise:diagnose-demo-login', ['--fix' => true]);
        $exitCode = $command->run();
        $this->assertEquals(0, $exitCode);

        $user = User::where('email', DemoAccount::EMAIL)->first();

        $this->assertNotNull($user);
        $this->assertNotNull($user->email_verified_at);
        $this->assertTrue(Hash::check(DemoAccount::PASSWORD, $user->password));
    }

    public function test_command_refuses_to_run_outside_local_or_testing_when_demo_flag_is_false(): void
    {
        $this->app->detectEnvironment(fn () => 'production');
        config(['demo.enabled' => false]);

        /** @var PendingCommand $command */
        $command = $this->artisan('wattwise:diagnose-demo-login');
        $command->expectsOutputToContain('Refusing to run');
        $exitCode = $command->run();
        $this->assertEquals(1, $exitCode);
    }

    public function test_command_is_allowed_outside_local_or_testing_when_demo_flag_is_true_but_fails_when_not_ready(): void
    {
        $this->app->detectEnvironment(fn () => 'production');
        config(['demo.enabled' => true]);

        /** @var PendingCommand $command */
        $command = $this->artisan('wattwise:diagnose-demo-login');
        $command->expectsOutputToContain('does NOT exist');
        $exitCode = $command->run();
        $this->assertEquals(1, $exitCode);
    }

    public function test_command_fix_refused_outside_local_or_testing_or_staging_when_environment_is_unsafe(): void
    {
        $this->app->detectEnvironment(fn () => 'production');
        config(['demo.enabled' => true]);

        /** @var PendingCommand $command */
        $command = $this->artisan('wattwise:diagnose-demo-login', ['--fix' => true]);
        $command->expectsOutputToContain('Refusing to apply --fix');
        $exitCode = $command->run();
        $this->assertEquals(1, $exitCode);
    }
}
