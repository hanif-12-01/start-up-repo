<?php

declare(strict_types=1);

namespace Tests\Unit\PhaseAware;

use App\Services\Predictions\PhaseAware\PhaseAwareRouter;
use App\Services\Predictions\PhaseAware\PredictionMode;
use App\Services\Predictions\PhaseAware\PredictionModePolicy;
use App\Services\Predictions\PhaseAware\ReportingPhase;
use InvalidArgumentException;
use Tests\TestCase;

final class PhaseAwareSafetyTest extends TestCase
{
    public function test_negative_history_is_rejected(): void
    {
        $this->expectException(InvalidArgumentException::class);
        ReportingPhase::fromHistoryMonths(-1);
    }

    public function test_missing_model_version_is_ineligible_without_changing_route(): void
    {
        config([
            'prediction.lightgbm_enabled' => true,
            'prediction.lightgbm_version' => '',
        ]);

        $route = (new PhaseAwareRouter)->route(3);

        $this->assertSame('lightgbm', $route->selectedModel);
        $this->assertFalse($route->eligible);
        $this->assertSame('MODEL_VERSION_UNCONFIGURED', $route->ineligibilityReason);
        $this->assertSame('deterministic_baseline', $route->fallbackModel);
    }

    public function test_nbeats_is_never_routed_below_its_six_month_minimum(): void
    {
        config([
            'prediction.lightgbm_enabled' => true,
            'prediction.nbeats_enabled' => true,
            'prediction.lightgbm_version' => 'lightgbm-test-v1',
            'prediction.nbeats_version' => 'nbeats-test-v1',
        ]);

        $this->assertSame('lightgbm', (new PhaseAwareRouter)->route(5)->selectedModel);
        $this->assertSame('nbeats', (new PhaseAwareRouter)->route(6)->selectedModel);
    }

    public function test_production_ml_requires_both_independent_approval_flags(): void
    {
        $this->app->detectEnvironment(fn (): string => 'production');

        foreach ([[true, false], [false, true], [false, false]] as [$allowed, $approved]) {
            config([
                'prediction.mode' => 'active',
                'prediction.allow_production_ml' => $allowed,
                'prediction.production_approved' => $approved,
            ]);

            $state = (new PredictionModePolicy)->resolve();
            $this->assertSame(PredictionMode::OFF, $state->effectiveMode);
            $this->assertFalse($state->shouldDispatch());
            $this->assertSame('PRODUCTION_APPROVAL_REQUIRED', $state->blockReason);
        }
    }
}
