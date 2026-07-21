<?php

declare(strict_types=1);

namespace App\Services\Predictions\PhaseAware;

use App\Models\Business;
use App\Models\PredictionRun;

final class PhaseAwarePredictionPresenter
{
    public function __construct(
        private readonly PredictionModePolicy $modePolicy,
    ) {}

    /** @param array<string, mixed> $deterministic */
    public function apply(array $deterministic, Business $business): array
    {
        $mode = $this->modePolicy->resolve()->effectiveMode;
        if (! in_array($mode, [PredictionMode::EXPERIMENTAL, PredictionMode::ACTIVE], true)) {
            return $deterministic;
        }

        $run = PredictionRun::query()
            ->where('business_id', $business->id)
            ->whereNotNull('reporting_phase')
            ->latest('generated_at')
            ->first();

        if ($run === null) {
            if ($mode === PredictionMode::EXPERIMENTAL) {
                $deterministic['experimental_prediction'] = [
                    'available' => false,
                    'selected_model' => null,
                    'reporting_phase' => null,
                    'predicted_usage_kwh' => null,
                    'deterministic_fallback_kwh' => $deterministic['predicted_usage_kwh'] ?? null,
                    'fallback_reason' => 'PREDICTION_PENDING',
                ];
            }

            return $deterministic;
        }

        $mlValue = $run->prediction_output_kwh === null
            ? null
            : (float) $run->prediction_output_kwh;
        $available = $run->phase_status === 'SUCCESS'
            && $mlValue !== null
            && is_finite($mlValue);

        if ($mode === PredictionMode::EXPERIMENTAL) {
            $deterministic['experimental_prediction'] = [
                'available' => $available,
                'selected_model' => $run->selected_model,
                'reporting_phase' => $run->reporting_phase,
                'predicted_usage_kwh' => $available ? $mlValue : null,
                'deterministic_fallback_kwh' => $run->deterministic_fallback_kwh === null
                    ? ($deterministic['predicted_usage_kwh'] ?? null)
                    : (float) $run->deterministic_fallback_kwh,
                'fallback_reason' => $available ? null : ($run->fallback_reason ?? 'ML_UNAVAILABLE'),
            ];

            return $deterministic;
        }

        if (! $available) {
            return $deterministic;
        }

        $previous = $deterministic['previous_usage_kwh'] ?? null;
        $deterministic['predicted_usage_kwh'] = round($mlValue, 2);
        $deterministic['estimated_bill_idr'] = $run->tariff_snapshot === null
            ? null
            : round($mlValue * (float) $run->tariff_snapshot, 2);
        $deterministic['change_percent'] = is_numeric($previous) && (float) $previous > 0
            ? round((($mlValue - (float) $previous) / (float) $previous) * 100, 2)
            : null;
        $deterministic['method_label'] = 'Prediksi AI fase-aware';
        $deterministic['prediction_source'] = 'phase_aware_ml';
        if (isset($deterministic['chart_data']) && is_array($deterministic['chart_data'])) {
            $last = array_key_last($deterministic['chart_data']);
            if ($last !== null && ($deterministic['chart_data'][$last]['type'] ?? null) === 'predicted') {
                $deterministic['chart_data'][$last]['usage_kwh'] = round($mlValue, 2);
            }
        }

        return $deterministic;
    }
}
