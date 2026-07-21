<?php

declare(strict_types=1);

namespace Tests\Unit\PhaseAware;

use App\Services\Predictions\PhaseAware\PredictionMode;
use App\Services\Predictions\PhaseAware\PredictionModePolicy;
use Tests\TestCase;

final class PredictionModePolicyTest extends TestCase
{
    public function test_off_is_default_and_dispatches_nothing(): void
    {
        config(['prediction.mode' => 'off']);
        $state = (new PredictionModePolicy)->resolve();

        $this->assertSame(PredictionMode::OFF, $state->effectiveMode);
        $this->assertFalse($state->shouldDispatch());
    }

    public function test_experimental_is_blocked_in_production(): void
    {
        $this->app->detectEnvironment(fn (): string => 'production');
        config([
            'prediction.mode' => 'experimental',
            'prediction.allow_production_ml' => true,
            'prediction.production_approved' => true,
        ]);

        $state = (new PredictionModePolicy)->resolve();
        $this->assertSame(PredictionMode::OFF, $state->effectiveMode);
        $this->assertSame('EXPERIMENTAL_BLOCKED_IN_PRODUCTION', $state->blockReason);
    }

    public function test_active_is_blocked_in_production_by_default(): void
    {
        $this->app->detectEnvironment(fn (): string => 'production');
        config([
            'prediction.mode' => 'active',
            'prediction.allow_production_ml' => false,
            'prediction.production_approved' => false,
        ]);

        $state = (new PredictionModePolicy)->resolve();
        $this->assertSame(PredictionMode::OFF, $state->effectiveMode);
        $this->assertSame('PRODUCTION_APPROVAL_REQUIRED', $state->blockReason);
    }

    public function test_invalid_mode_fails_closed(): void
    {
        config(['prediction.mode' => 'sometimes']);
        $state = (new PredictionModePolicy)->resolve();

        $this->assertSame(PredictionMode::OFF, $state->effectiveMode);
        $this->assertSame('INVALID_MODE', $state->blockReason);
    }

    public function test_shadow_is_available_outside_production(): void
    {
        $this->app->detectEnvironment(fn (): string => 'testing');
        config(['prediction.mode' => 'shadow']);
        $state = (new PredictionModePolicy)->resolve();

        $this->assertSame(PredictionMode::SHADOW, $state->effectiveMode);
        $this->assertTrue($state->shouldDispatch());
    }
}
