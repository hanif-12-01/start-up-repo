<?php

declare(strict_types=1);

namespace App\Services\Predictions\PhaseAware;

final class PhaseAwareRouter
{
    public const FALLBACK_MODEL = 'deterministic_baseline';

    /** @param array<string, mixed> $contextualFeatures */
    public function route(int $historyMonths, array $contextualFeatures = []): PhaseRoute
    {
        $phase = ReportingPhase::fromHistoryMonths($historyMonths);
        [$model, $reason] = match ($phase) {
            ReportingPhase::H00 => ['lightgbm', 'PHASE_A_H00_CHAMPION'],
            ReportingPhase::H01_02 => [self::FALLBACK_MODEL, 'PHASE_A_H01_02_BASELINE'],
            ReportingPhase::H03_05 => ['lightgbm', 'PHASE_A_H03_05_CHAMPION'],
            ReportingPhase::H06_12 => ['nbeats', 'PHASE_A_H06_12_CHAMPION'],
            ReportingPhase::H13_PLUS => ['nbeats', 'PHASE_A_H13_PLUS_CHAMPION'],
        };

        $version = $this->modelVersion($model);
        $ineligibilityReason = $this->ineligibilityReason(
            $phase,
            $model,
            $version,
            $historyMonths,
            $contextualFeatures,
        );

        return new PhaseRoute(
            $phase,
            $model,
            $ineligibilityReason === null,
            self::FALLBACK_MODEL,
            $reason,
            $version,
            $ineligibilityReason,
        );
    }

    private function modelVersion(string $model): string
    {
        return match ($model) {
            self::FALLBACK_MODEL => '1.0',
            'lightgbm' => trim((string) config('prediction.lightgbm_version', '')),
            'nbeats' => trim((string) config('prediction.nbeats_version', '')),
            default => '',
        };
    }

    /** @param array<string, mixed> $context */
    private function ineligibilityReason(
        ReportingPhase $phase,
        string $model,
        string $version,
        int $historyMonths,
        array $context,
    ): ?string {
        if ($model === self::FALLBACK_MODEL) {
            return $historyMonths >= 1 ? null : 'INSUFFICIENT_HISTORY';
        }

        $enabled = (bool) config("prediction.{$model}_enabled", false);
        if (! $enabled) {
            return 'MODEL_DISABLED';
        }
        if ($version === '') {
            return 'MODEL_VERSION_UNCONFIGURED';
        }
        if ($phase === ReportingPhase::H00 && ($context['profile_eligible'] ?? false) !== true) {
            return 'MISSING_VALIDATED_STATIC_PROFILE';
        }
        if ($model === 'nbeats' && $historyMonths < 6) {
            return 'MINIMUM_CONTEXT_6_MONTHS';
        }

        return null;
    }
}
