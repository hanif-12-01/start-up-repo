<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\ElectricityEntry;
use App\Models\User;
use App\Services\Demo\DemoMlScenarioReadinessService;
use App\Services\Demo\DemoMlValidationService;
use App\Services\Demo\DemoProvisioningService;
use App\Support\DemoAccount;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

final class DemoProvisioningServiceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->app->detectEnvironment(fn (): string => 'staging');
        config([
            'demo.enabled' => true,
            'demo.ml_validation_enabled' => true,
        ]);
    }

    public function test_provisions_exact_contiguous_five_scenario_contract(): void
    {
        $result = app(DemoProvisioningService::class)->provision();

        $this->assertTrue($result->ready);
        $user = User::query()->where('email', DemoAccount::EMAIL)->firstOrFail();

        foreach (DemoAccount::ML_SCENARIOS as $definition) {
            $business = $user->businesses()
                ->where('name', $definition['business_name'])
                ->firstOrFail();
            $periods = $business->electricityEntries()
                ->orderBy('period_month')
                ->pluck('period_month')
                ->map(fn ($period): Carbon => Carbon::parse((string) $period));

            $this->assertCount((int) $definition['history_months'], $periods);
            $this->assertSame($definition['expected_phase'], DemoMlValidationService::phaseForMonths($periods->count()));

            foreach ($periods as $index => $period) {
                $this->assertSame(1, $period->day);
                if ($index > 0) {
                    $this->assertTrue($periods[$index - 1]->copy()->addMonth()->equalTo($period));
                }
            }
        }

        $this->assertTrue(app(DemoMlScenarioReadinessService::class)->check($user)->ready);
    }

    public function test_repairs_missing_scenario_and_incomplete_history_without_deleting_extra_business(): void
    {
        app(DemoProvisioningService::class)->provision();
        $user = User::query()->where('email', DemoAccount::EMAIL)->firstOrFail();

        $missing = $user->businesses()->where('name', DemoAccount::ML_SCENARIOS['h00']['business_name'])->firstOrFail();
        $missing->delete();

        $incomplete = $user->businesses()->where('name', DemoAccount::ML_SCENARIOS['h13_plus']['business_name'])->firstOrFail();
        ElectricityEntry::query()->where('business_id', $incomplete->id)->orderBy('period_month')->firstOrFail()->delete();

        $extra = Business::query()->create([
            'user_id' => $user->id,
            'name' => 'Harmless extra demo business',
            'business_type' => 'OTHER',
            'status' => Business::STATUS_ACTIVE,
        ]);

        $result = app(DemoProvisioningService::class)->provision();

        $this->assertTrue($result->ready);
        $this->assertDatabaseHas('businesses', ['id' => $extra->id, 'user_id' => $user->id]);
        $this->assertTrue(app(DemoMlScenarioReadinessService::class)->check($user->fresh())->ready);
    }

    public function test_repairs_account_subscription_archived_primary_and_baselines_idempotently(): void
    {
        app(DemoProvisioningService::class)->provision();
        $user = User::query()->where('email', DemoAccount::EMAIL)->firstOrFail();
        $primary = $user->businesses()->where('name', DemoAccount::BUSINESS_NAME)->firstOrFail();

        $user->forceFill([
            'password' => Hash::make('stale-test-value'),
            'email_verified_at' => null,
            'initial_plan_selected_at' => null,
        ])->save();
        $user->subscription()->delete();
        $primary->update(['status' => Business::STATUS_ARCHIVED]);
        $primary->electricityProfile()->delete();

        $repair = app(DemoProvisioningService::class)->provision();
        $secondRun = app(DemoProvisioningService::class)->provision();

        $this->assertSame('PROVISIONED', $repair->status);
        $this->assertSame('ALREADY_READY', $secondRun->status);
        $user->refresh();
        $primary->refresh();
        $this->assertTrue(Hash::check(DemoAccount::PASSWORD, $user->password));
        $this->assertNotNull($user->email_verified_at);
        $this->assertNotNull($user->initial_plan_selected_at);
        $this->assertNotNull($user->subscription);
        $this->assertSame(Business::STATUS_ACTIVE, $primary->status);
        $this->assertTrue($primary->electricityProfile()->exists());
    }

    public function test_non_demo_user_is_never_modified(): void
    {
        $customer = User::query()->create([
            'name' => 'Customer',
            'email' => 'customer@example.test',
            'password' => Hash::make('customer-test-value'),
        ]);
        $originalUpdatedAt = $customer->updated_at;

        app(DemoProvisioningService::class)->provision();

        $customer->refresh();
        $this->assertSame('Customer', $customer->name);
        $this->assertTrue($customer->updated_at->equalTo($originalUpdatedAt));
    }
}
