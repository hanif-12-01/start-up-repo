<?php

declare(strict_types=1);

namespace Tests\Unit\PhaseAware;

use App\Services\Predictions\PhaseAware\PhaseAwareRouter;
use App\Services\Predictions\PhaseAware\ReportingPhase;
use Tests\TestCase;

final class PhaseAwareRouterTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config([
            'prediction.lightgbm_enabled' => true,
            'prediction.nbeats_enabled' => true,
            'prediction.lightgbm_version' => 'lightgbm-test-v1',
            'prediction.nbeats_version' => 'nbeats-test-v1',
        ]);
    }

    public function test_phase_boundaries_match_qualification_contract(): void
    {
        $expected = [
            0 => ReportingPhase::H00,
            1 => ReportingPhase::H01_02,
            2 => ReportingPhase::H01_02,
            3 => ReportingPhase::H03_05,
            5 => ReportingPhase::H03_05,
            6 => ReportingPhase::H06_12,
            12 => ReportingPhase::H06_12,
            13 => ReportingPhase::H13_PLUS,
            120 => ReportingPhase::H13_PLUS,
        ];

        foreach ($expected as $months => $phase) {
            $this->assertSame($phase, ReportingPhase::fromHistoryMonths($months));
        }
    }

    public function test_exact_phase_a_routing_table_and_fallback(): void
    {
        $router = new PhaseAwareRouter;
        $profile = ['profile_eligible' => true];
        $expected = [
            0 => 'lightgbm',
            1 => 'deterministic_baseline',
            3 => 'lightgbm',
            6 => 'nbeats',
            13 => 'nbeats',
        ];

        foreach ($expected as $months => $model) {
            $route = $router->route($months, $profile);
            $this->assertSame($model, $route->selectedModel);
            $this->assertSame('deterministic_baseline', $route->fallbackModel);
            $this->assertTrue($route->eligible);
        }
    }

    public function test_h00_missing_static_profile_is_not_eligible(): void
    {
        $route = (new PhaseAwareRouter)->route(0, ['profile_eligible' => false]);

        $this->assertSame('lightgbm', $route->selectedModel);
        $this->assertFalse($route->eligible);
        $this->assertSame('MISSING_VALIDATED_STATIC_PROFILE', $route->ineligibilityReason);
        $this->assertSame('deterministic_baseline', $route->fallbackModel);
    }

    public function test_disabled_model_is_ineligible_without_changing_route(): void
    {
        config(['prediction.nbeats_enabled' => false]);
        $route = (new PhaseAwareRouter)->route(6);

        $this->assertSame('nbeats', $route->selectedModel);
        $this->assertFalse($route->eligible);
        $this->assertSame('MODEL_DISABLED', $route->ineligibilityReason);
    }
}
