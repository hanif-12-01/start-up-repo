<?php

namespace Tests\Feature\MachineLearning;

use App\Http\Controllers\PredictionController;
use App\Models\Business;
use App\Models\ElectricityEntry;
use App\Models\User;
use App\Services\Predictions\PredictionService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegressionSafetyTest extends TestCase
{
    use RefreshDatabase;

    private function seedBusiness(int $months = 5): Business
    {
        $user = User::factory()->create();
        $business = Business::create([
            'user_id' => $user->id,
            'name' => 'Test Business '.uniqid(),
            'business_type' => 'FNB',
            'status' => 'ACTIVE',
        ]);

        $cursor = Carbon::parse('2025-06-01');
        for ($i = 0; $i < $months; $i++) {
            ElectricityEntry::create([
                'business_id' => $business->id,
                'period_month' => $cursor->format('Y-m-d'),
                'usage_kwh' => 500 + $i * 50,
                'bill_amount_idr' => (500 + $i * 50) * 1444.7,
                'tariff_per_kwh' => 1444.7,
            ]);
            $cursor->addMonth();
        }

        return $business;
    }

    public function test_prediction_service_unchanged(): void
    {
        $business = $this->seedBusiness(5);
        $service = app(PredictionService::class);
        $result = $service->predictForBusiness($business, false);

        $this->assertIsArray($result);
        $this->assertArrayHasKey('has_prediction', $result);
        $this->assertArrayHasKey('predicted_usage_kwh', $result);
        $this->assertArrayNotHasKey('model_key', $result);
        $this->assertArrayNotHasKey('shadow', $result);
        $this->assertArrayNotHasKey('ridge', $result);
        $this->assertArrayNotHasKey('gradient_boosting', $result);
    }

    public function test_prediction_controller_returns_no_ml_data(): void
    {
        $business = $this->seedBusiness(5);
        $user = $business->user;

        $resp = $this->actingAs($user)->get(route('predictions.index', ['business_id' => $business->id]));
        $resp->assertOk();

        $page = $resp->original->getData()['page'] ?? null;
        if ($page) {
            $props = $page['props'] ?? [];
            $this->assertArrayNotHasKey('shadow_results', $props);
            $this->assertArrayNotHasKey('ml_predictions', $props);
            $this->assertArrayNotHasKey('model_comparison', $props);
        }
    }

    public function test_dashboard_returns_no_ml_data(): void
    {
        $business = $this->seedBusiness(5);
        $user = $business->user;

        $resp = $this->actingAs($user)->get(route('dashboard'));
        $resp->assertOk();

        $page = $resp->original->getData()['page'] ?? null;
        if ($page) {
            $props = $page['props'] ?? [];
            $this->assertArrayNotHasKey('shadow_results', $props);
            $this->assertArrayNotHasKey('ml_predictions', $props);
            $this->assertArrayNotHasKey('model_comparison', $props);
        }
    }

    public function test_prediction_controller_uses_deterministic_service(): void
    {
        $ref = new \ReflectionClass(PredictionController::class);
        $constructor = $ref->getConstructor();
        $params = $constructor->getParameters();

        $predictionParam = collect($params)->first(fn ($p) => $p->getName() === 'predictionService');
        $this->assertNotNull($predictionParam);
        $this->assertSame(PredictionService::class, $predictionParam->getType()->getName());
    }

    public function test_all_feature_flags_default_false(): void
    {
        $keys = ['shadow_enabled', 'ridge_enabled', 'gradient_boosting_enabled', 'adaptive_router_enabled'];
        foreach ($keys as $key) {
            $this->assertFalse(
                config("prediction.{$key}"),
                "prediction.{$key} should default to false"
            );
        }
    }
}
