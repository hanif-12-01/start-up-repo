<?php

namespace Tests\Feature;

use App\Models\Appliance;
use App\Models\Business;
use App\Models\ElectricityEntry;
use App\Models\RevenueEntry;
use App\Models\Subscription;
use App\Models\User;
use App\Support\DemoAccount;
use Database\Seeders\WattWiseDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DemoLoginReadinessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['demo.enabled' => true]);
        $this->app->detectEnvironment(fn (): string => 'staging');
    }

    private function seedReadyDemo(): User
    {
        $this->seed(WattWiseDemoSeeder::class);

        return User::where('email', DemoAccount::EMAIL)->firstOrFail();
    }

    private function assertDemoCredentialsHidden(string $routeName, bool $unavailable): void
    {
        $this->get(route($routeName))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('demo.ready', false)
                ->where('demo.enabled', ! $unavailable ? false : true)
                ->missing('demo.credentials')
                ->missing('demo.reason')
            );
    }

    public function test_disabled_demo_hides_credentials(): void
    {
        config(['demo.enabled' => false]);
        $this->assertDemoCredentialsHidden('login', false);
        $this->assertDemoCredentialsHidden('home', false);
    }

    public function test_production_env_hides_credentials_even_if_flag_enabled(): void
    {
        $this->app->detectEnvironment(fn (): string => 'production');

        $user = User::create([
            'email' => DemoAccount::EMAIL,
            'name' => DemoAccount::USER_NAME,
            'password' => Hash::make(DemoAccount::PASSWORD),
            'email_verified_at' => now(),
        ]);

        $business = Business::create([
            'user_id' => $user->id,
            'name' => DemoAccount::BUSINESS_NAME,
            'business_type' => 'KOS_PROPERTY',
            'status' => 'ACTIVE',
        ]);

        $business->businessProfile()->create([
            'room_count' => 20,
            'occupied_room_count' => 16,
            'employee_count' => 2,
            'operating_days_per_month' => 30,
        ]);

        $business->electricityProfile()->create([
            'customer_type' => 'Bisnis/Rumah Tangga',
            'power_va' => 2200,
            'tariff_per_kwh' => 1444.70,
            'payment_method' => 'Pascabayar',
        ]);

        Subscription::create([
            'user_id' => $user->id,
            'plan' => DemoAccount::SUBSCRIPTION_PLAN,
            'status' => 'ACTIVE',
            'trial_ends_at' => now()->addDays(30),
            'current_period_ends_at' => now()->addDays(30),
        ]);

        for ($i = 0; $i < 6; $i++) {
            $business->electricityEntries()->create([
                'period_month' => now()->subMonths($i)->format('Y-m-d'),
                'usage_kwh' => 100,
                'bill_amount_idr' => 100000,
                'meter_start' => 0,
                'meter_end' => 100,
                'tariff_per_kwh' => 1444.70,
                'payment_method' => 'Pascabayar',
            ]);
            $business->revenueEntries()->create([
                'period_month' => now()->subMonths($i)->format('Y-m-d'),
                'revenue_amount_idr' => 1000000,
                'revenue_input_mode' => 'EXACT',
            ]);
        }

        for ($i = 0; $i < 10; $i++) {
            $business->appliances()->create([
                'name' => "Appliance $i",
                'category' => 'Other',
                'watt' => 100,
                'quantity' => 1,
                'hours_per_day' => 1,
                'days_per_month' => 30,
                'source' => 'TEMPLATE',
                'confidence' => 'COMMON_MARKET_RANGE',
            ]);
        }

        $this->assertDemoCredentialsHidden('login', false);
        $this->assertDemoCredentialsHidden('home', false);
    }

    public function test_missing_user_hides_credentials(): void
    {
        // No seeding, so user is missing.
        $this->assertDemoCredentialsHidden('login', true);
    }

    public function test_wrong_password_hides_credentials(): void
    {
        $user = $this->seedReadyDemo();
        $user->password = Hash::make('wrong_password');
        $user->save();

        $this->assertDemoCredentialsHidden('login', true);
    }

    public function test_unverified_email_hides_credentials(): void
    {
        $user = $this->seedReadyDemo();
        $user->email_verified_at = null;
        $user->save();

        $this->assertDemoCredentialsHidden('login', true);
    }

    public function test_archived_or_missing_or_foreign_business_hides_credentials(): void
    {
        $user = $this->seedReadyDemo();

        /** @var Business $business */
        $business = $user->businesses()->firstOrFail();
        $business->status = 'ARCHIVED';
        $business->save();

        $this->assertDemoCredentialsHidden('login', true);
    }

    public function test_incomplete_electricity_baseline_hides_credentials(): void
    {
        $user = $this->seedReadyDemo();
        /** @var Business $business */
        $business = $user->businesses()->firstOrFail();

        // Delete some electricity entries to make it < 6
        ElectricityEntry::where('business_id', $business->id)->limit(2)->delete();

        $this->assertDemoCredentialsHidden('login', true);
    }

    public function test_incomplete_revenue_baseline_hides_credentials(): void
    {
        $user = $this->seedReadyDemo();
        /** @var Business $business */
        $business = $user->businesses()->firstOrFail();

        // Delete some revenue entries to make it < 6
        RevenueEntry::where('business_id', $business->id)->limit(2)->delete();

        $this->assertDemoCredentialsHidden('login', true);
    }

    public function test_incomplete_appliance_baseline_hides_credentials(): void
    {
        $user = $this->seedReadyDemo();
        /** @var Business $business */
        $business = $user->businesses()->firstOrFail();

        // Delete some appliances to make it < 10
        Appliance::where('business_id', $business->id)->limit(2)->delete();

        $this->assertDemoCredentialsHidden('login', true);
    }

    public function test_missing_or_expired_or_unusable_subscription_hides_credentials(): void
    {
        $user = $this->seedReadyDemo();

        /** @var Subscription $subscription */
        $subscription = $user->subscription;
        $subscription->trial_ends_at = now()->subDays(1);
        $subscription->current_period_ends_at = now()->subDays(1);
        $subscription->save();

        $this->assertDemoCredentialsHidden('login', true);
    }

    public function test_fully_ready_staging_demo_shows_credentials(): void
    {
        $this->seedReadyDemo();

        $this->get(route('login'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('demo.enabled', true)
                ->where('demo.ready', true)
                ->where('demo.available', true)
                ->where('demo.credentials.email', DemoAccount::EMAIL)
                ->where('demo.credentials.password', DemoAccount::PASSWORD)
                ->missing('demo.reason')
            );
    }
}
