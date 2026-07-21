<?php

declare(strict_types=1);

namespace App\Services\Predictions\PhaseAware;

use App\Models\ElectricityEntry;
use Carbon\Carbon;

final class PredictionInputBuilder
{
    public function build(ElectricityEntry $sourceEntry): PhaseAwarePredictionInput
    {
        $business = $sourceEntry->business()->with('electricityProfile')->firstOrFail();
        $entries = $business->electricityEntries()
            ->where('period_month', '<=', $sourceEntry->period_month)
            ->orderBy('period_month')
            ->get();

        $fullHistory = [];
        foreach ($entries as $entry) {
            if ($entry->usage_kwh === null) {
                continue;
            }
            $usage = (float) $entry->usage_kwh;
            if (! is_finite($usage) || $usage < 0) {
                continue;
            }
            $fullHistory[] = [
                'period_month' => Carbon::parse($entry->period_month)->format('Y-m'),
                'usage_kwh' => $usage,
            ];
        }

        $continuousHistory = $this->latestContinuousHistory($fullHistory);
        $last = end($continuousHistory);
        if ($last === false) {
            throw new \RuntimeException('No valid consumption history is available.');
        }

        $tariff = $business->electricityProfile?->tariff_per_kwh;
        if ($tariff === null) {
            $latestWithTariff = $entries->whereNotNull('tariff_per_kwh')->last();
            $tariff = $latestWithTariff?->tariff_per_kwh;
        }
        $tariff = $tariff === null ? null : (float) $tariff;

        // These are the benchmark's exact contextual fields. Missing fields stay null.
        // WattWise does not currently store a validated BDG2 static profile, so H00
        // must remain ineligible rather than mapping city/type into different semantics.
        $context = [
            'dataset_source' => 'wattwise_application',
            'building_primary_use' => null,
            'business_type' => $business->business_type ?: null,
            'building_area' => null,
            'site' => null,
            'timezone' => null,
            'profile_eligible' => false,
        ];

        return new PhaseAwarePredictionInput(
            $business->id,
            $sourceEntry->id,
            Carbon::parse($last['period_month'].'-01')->addMonth()->format('Y-m'),
            $fullHistory,
            $continuousHistory,
            $context,
            $tariff,
        );
    }

    /**
     * Benchmark examples reset history after a monthly gap. Match that behavior
     * by retaining only the latest consecutive suffix.
     *
     * @param  list<array{period_month: string, usage_kwh: float}>  $history
     * @return list<array{period_month: string, usage_kwh: float}>
     */
    public function latestContinuousHistory(array $history): array
    {
        if ($history === []) {
            return [];
        }

        $continuous = [array_pop($history)];
        while ($history !== []) {
            $candidate = array_pop($history);
            $oldest = $continuous[0];
            $expected = Carbon::parse($oldest['period_month'].'-01')
                ->subMonth()
                ->format('Y-m');
            if ($candidate['period_month'] !== $expected) {
                break;
            }
            array_unshift($continuous, $candidate);
        }

        return $continuous;
    }
}
