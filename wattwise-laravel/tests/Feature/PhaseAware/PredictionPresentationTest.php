<?php

declare(strict_types=1);

namespace Tests\Feature\PhaseAware;

use App\Models\Business;
use App\Models\PredictionRun;
use App\Models\User;
use App\Services\Predictions\PhaseAware\PhaseAwarePredictionPresenter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class PredictionPresentationTest extends TestCase
{
    use RefreshDatabase;

    public function test_shadow_never_changes_user_facing_deterministic_output(): void
    {
        config(['prediction.mode' => 'shadow']);
        $business = $this->business();
        $this->successfulRun($business);
        $deterministic = ['predicted_usage_kwh' => 200.0, 'prediction_source' => 'deterministic'];

        $presented = app(PhaseAwarePredictionPresenter::class)->apply($deterministic, $business);

        $this->assertSame($deterministic, $presented);
        $this->assertArrayNotHasKey('experimental_prediction', $presented);
    }

    public function test_experimental_labels_ai_separately_from_deterministic_output(): void
    {
        config(['prediction.mode' => 'experimental']);
        $business = $this->business();
        $this->successfulRun($business);
        $deterministic = ['predicted_usage_kwh' => 200.0, 'prediction_source' => 'deterministic'];

        $presented = app(PhaseAwarePredictionPresenter::class)->apply($deterministic, $business);

        $this->assertSame(200.0, $presented['predicted_usage_kwh']);
        $this->assertSame('deterministic', $presented['prediction_source']);
        $this->assertTrue($presented['experimental_prediction']['available']);
        $this->assertSame(321.5, $presented['experimental_prediction']['predicted_usage_kwh']);
    }

    private function business(): Business
    {
        $user = User::factory()->create();

        return Business::create([
            'user_id' => $user->id,
            'name' => 'Presentation Test',
            'business_type' => 'FNB',
            'status' => 'ACTIVE',
        ]);
    }

    private function successfulRun(Business $business): void
    {
        PredictionRun::create([
            'business_id' => $business->id,
            'request_id' => str_repeat('a', 64),
            'reporting_phase' => 'H03_05',
            'selected_model' => 'lightgbm',
            'selected_model_version' => 'lightgbm-test-v1',
            'prediction_mode' => 'experimental',
            'phase_status' => 'SUCCESS',
            'prediction_output_kwh' => 321.5,
            'deterministic_fallback_kwh' => 200.0,
            'eligibility_status' => 'ELIGIBLE',
            'target_period' => '2026-04',
            'input_fingerprint' => str_repeat('b', 64),
            'trigger_source' => 'test',
            'history_months' => 3,
            'history_bucket' => 'H03_05',
            'business_type_snapshot' => 'FNB',
            'tariff_snapshot' => 1500,
            'generated_at' => now(),
        ]);
    }
}
