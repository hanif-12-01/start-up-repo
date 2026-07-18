<?php

namespace Tests\Feature;

use App\Models\PredictionRun;
use App\Models\User;
use App\Services\Demo\DemoMlValidationService;
use App\Support\DemoAccount;
use Database\Seeders\WattWiseDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DemoMlValidationTest extends TestCase
{
    use RefreshDatabase;

    public function test_demo_seeder_creates_one_account_with_five_history_phase_cases(): void
    {
        $this->seed(WattWiseDemoSeeder::class);

        $user = User::where('email', DemoAccount::EMAIL)->firstOrFail();
        $this->assertSame(5, $user->businesses()->count());

        foreach (DemoAccount::ML_SCENARIOS as $definition) {
            $business = $user->businesses()
                ->where('name', $definition['business_name'])
                ->firstOrFail();

            $this->assertSame(
                (int) $definition['history_months'],
                $business->electricityEntries()->whereNotNull('usage_kwh')->count(),
                'Unexpected history length for '.$definition['business_name'],
            );

            $this->assertSame(
                $definition['expected_phase'],
                DemoMlValidationService::phaseForMonths((int) $definition['history_months']),
            );
        }
    }

    public function test_demo_user_can_open_ml_validation_page_when_enabled(): void
    {
        config([
            'demo.enabled' => true,
            'demo.ml_validation_enabled' => true,
        ]);
        $this->seed(WattWiseDemoSeeder::class);

        $user = User::where('email', DemoAccount::EMAIL)->firstOrFail();

        $this->actingAs($user)
            ->get(route('demo.ml-validation'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Demo/MlValidation')
                ->where('demoAccount.email', DemoAccount::EMAIL)
                ->where('demoAccount.scenario_count', 5)
                ->has('scenarios', 5)
                ->has('registeredModels')
            );
    }

    public function test_ml_validation_page_is_hidden_when_feature_flag_is_disabled(): void
    {
        config([
            'demo.enabled' => true,
            'demo.ml_validation_enabled' => false,
        ]);
        $this->seed(WattWiseDemoSeeder::class);

        $user = User::where('email', DemoAccount::EMAIL)->firstOrFail();

        $this->actingAs($user)
            ->get(route('demo.ml-validation'))
            ->assertNotFound();
    }

    public function test_shadow_validation_runs_four_non_empty_cases_and_exposes_missing_new_models(): void
    {
        config([
            'demo.enabled' => true,
            'demo.ml_validation_enabled' => true,
            'prediction.shadow_enabled' => true,
            'prediction.ridge_enabled' => true,
            'prediction.gradient_boosting_enabled' => true,
        ]);
        $this->seed(WattWiseDemoSeeder::class);

        $user = User::where('email', DemoAccount::EMAIL)->firstOrFail();

        $this->actingAs($user)
            ->post(route('demo.ml-validation.run'))
            ->assertRedirect(route('demo.ml-validation'));

        $this->assertSame(
            4,
            PredictionRun::query()
                ->whereHas('business', fn ($query) => $query->where('user_id', $user->id))
                ->count(),
        );

        $summary = app(DemoMlValidationService::class)->summarize($user);
        $scenarios = collect($summary['scenarios'])->keyBy('scenario_key');

        $this->assertSame('PORTFOLIO_MODEL_NOT_REGISTERED', $scenarios['h00']['proof_status']);
        $this->assertSame('SUCCESS', $scenarios['h01_02']['proof_status']);
        $this->assertSame('PORTFOLIO_MODEL_NOT_REGISTERED', $scenarios['h03_05']['proof_status']);
        $this->assertSame('PORTFOLIO_MODEL_NOT_REGISTERED', $scenarios['h06_12']['proof_status']);
        $this->assertSame('PORTFOLIO_MODEL_NOT_REGISTERED', $scenarios['h13_plus']['proof_status']);
        $this->assertContains('lightgbm', $summary['summary']['missing_portfolio_models']);
        $this->assertContains('nbeats', $summary['summary']['missing_portfolio_models']);
        $this->assertFalse($summary['summary']['new_portfolio_fully_integrated']);
    }
}
