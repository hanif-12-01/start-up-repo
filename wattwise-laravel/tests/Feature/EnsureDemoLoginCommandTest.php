<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\User;
use App\Support\DemoAccount;
use Database\Seeders\WattWiseDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Testing\PendingCommand;
use Tests\TestCase;

class EnsureDemoLoginCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_ensure_disabled_is_noop_success(): void
    {
        config(['demo.enabled' => false]);
        /** @var PendingCommand $command */
        $command = $this->artisan('wattwise:ensure-demo-login');
        $command->expectsOutputToContain('Demo login is disabled');
        $exitCode = $command->run();
        $this->assertEquals(0, $exitCode);
    }

    public function test_ensure_unsafe_environment_returns_failure_without_mutation(): void
    {
        $this->app->detectEnvironment(fn () => 'production');
        config(['demo.enabled' => true]);

        /** @var PendingCommand $command */
        $command = $this->artisan('wattwise:ensure-demo-login');
        $command->expectsOutputToContain('Refusing to run in unsafe environment');
        $exitCode = $command->run();
        $this->assertEquals(1, $exitCode);

        $this->assertDatabaseMissing('users', ['email' => DemoAccount::EMAIL]);
    }

    public function test_ensure_creates_missing_demo_safely(): void
    {
        config(['demo.enabled' => true]);
        $this->assertDatabaseMissing('users', ['email' => DemoAccount::EMAIL]);

        /** @var PendingCommand $command */
        $command = $this->artisan('wattwise:ensure-demo-login');
        $command->expectsOutputToContain('Performing repairs...');
        $exitCode = $command->run();
        $this->assertEquals(0, $exitCode);

        $this->assertDatabaseHas('users', ['email' => DemoAccount::EMAIL]);
    }

    public function test_ensure_repairs_stale_password(): void
    {
        config(['demo.enabled' => true]);
        $this->seed(WattWiseDemoSeeder::class);

        $user = User::where('email', DemoAccount::EMAIL)->firstOrFail();
        $user->password = Hash::make('different_password');
        $user->save();

        /** @var PendingCommand $command */
        $command = $this->artisan('wattwise:ensure-demo-login');
        $command->expectsOutputToContain('Performing repairs...');
        $exitCode = $command->run();
        $this->assertEquals(0, $exitCode);

        $user->refresh();
        $this->assertTrue(Hash::check(DemoAccount::PASSWORD, $user->password));
    }

    public function test_ensure_verifies_email(): void
    {
        config(['demo.enabled' => true]);
        $this->seed(WattWiseDemoSeeder::class);

        $user = User::where('email', DemoAccount::EMAIL)->firstOrFail();
        $user->email_verified_at = null;
        $user->save();

        /** @var PendingCommand $command */
        $command = $this->artisan('wattwise:ensure-demo-login');
        $command->expectsOutputToContain('Performing repairs...');
        $exitCode = $command->run();
        $this->assertEquals(0, $exitCode);

        $user->refresh();
        $this->assertNotNull($user->email_verified_at);
    }

    public function test_ensure_repairs_missing_baseline_and_subscription(): void
    {
        config(['demo.enabled' => true]);
        $this->seed(WattWiseDemoSeeder::class);

        $user = User::where('email', DemoAccount::EMAIL)->firstOrFail();
        $subscription = $user->subscription;
        $subscription->delete();

        /** @var PendingCommand $command */
        $command = $this->artisan('wattwise:ensure-demo-login');
        $command->expectsOutputToContain('Performing repairs...');
        $exitCode = $command->run();
        $this->assertEquals(0, $exitCode);

        $user->refresh();
        $this->assertNotNull($user->subscription);
    }

    public function test_ensure_is_idempotent_and_does_not_reseed_healthy_demo(): void
    {
        config(['demo.enabled' => true]);
        $this->seed(WattWiseDemoSeeder::class);

        // First run when healthy
        /** @var PendingCommand $command1 */
        $command1 = $this->artisan('wattwise:ensure-demo-login');
        $command1->expectsOutputToContain('Demo login is already ready');
        $exitCode1 = $command1->run();
        $this->assertEquals(0, $exitCode1);

        // Check that healthy data was not rewritten / mutated
        $user = User::where('email', DemoAccount::EMAIL)->firstOrFail();
        $createdAt = $user->created_at;

        /** @var PendingCommand $command2 */
        $command2 = $this->artisan('wattwise:ensure-demo-login');
        $command2->expectsOutputToContain('Demo login is already ready');
        $exitCode2 = $command2->run();
        $this->assertEquals(0, $exitCode2);

        $user->refresh();
        $this->assertEquals($createdAt->toDateTimeString(), $user->created_at->toDateTimeString());
    }

    public function test_ensure_repairs_missing_initial_plan_selected_at(): void
    {
        config(['demo.enabled' => true]);
        $this->seed(WattWiseDemoSeeder::class);

        $user = User::where('email', DemoAccount::EMAIL)->firstOrFail();
        $user->initial_plan_selected_at = null;
        $user->email_verified_at = null; // break something so repair block runs
        $user->save();

        /** @var PendingCommand $command */
        $command = $this->artisan('wattwise:ensure-demo-login');
        $command->expectsOutputToContain('Performing repairs...');
        $exitCode = $command->run();
        $this->assertEquals(0, $exitCode);

        $user->refresh();
        $this->assertNotNull($user->initial_plan_selected_at);
        $this->assertNotNull($user->email_verified_at);
    }

    public function test_ensure_leaves_non_demo_users_and_businesses_untouched(): void
    {
        config(['demo.enabled' => true]);

        // Create a non-demo user and business
        $nonDemoUser = User::create([
            'name' => 'Regular Customer',
            'email' => 'customer@example.com',
            'password' => Hash::make('customer_pass'),
            'email_verified_at' => now(),
        ]);

        $nonDemoBusiness = Business::create([
            'user_id' => $nonDemoUser->id,
            'name' => 'Customer Business',
            'business_type' => 'KOS_PROPERTY',
            'status' => 'ACTIVE',
        ]);

        /** @var PendingCommand $command */
        $command = $this->artisan('wattwise:ensure-demo-login');
        $exitCode = $command->run();
        $this->assertEquals(0, $exitCode);

        // Verify non-demo user and business are untouched
        $this->assertDatabaseHas('users', ['email' => 'customer@example.com']);
        $this->assertDatabaseHas('businesses', ['name' => 'Customer Business', 'user_id' => $nonDemoUser->id]);
    }

    public function test_ensure_fails_when_lock_cannot_be_acquired(): void
    {
        config(['demo.enabled' => true]);

        // Mock the lock to be already held
        $lock = Cache::lock('ensure-demo-login-lock', 60);
        $lock->get(); // Acquire lock manually in the test

        /** @var PendingCommand $command */
        $command = $this->artisan('wattwise:ensure-demo-login');
        $command->expectsOutputToContain('Could not acquire atomic lock');
        $exitCode = $command->run();
        $this->assertEquals(1, $exitCode);

        $lock->release(); // Release the lock
    }
}
