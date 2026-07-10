<?php

namespace App\Services\Anomalies;

use App\Models\Business;
use App\Services\FeatureGateService;
use App\Services\Electricity\ElectricityCalculator;
use Carbon\Carbon;

class AnomalyService
{
    public const STATUS_NORMAL = 'Normal';
    public const STATUS_WARNING = 'Perlu Dicek';
    public const STATUS_ANOMALY = 'Boros';

    // Deterministic thresholds (documented in code)
    public const THRES_BOROS = 20.0; // 20% increase or more
    public const THRES_DICEK = 10.0; // 10% to less than 20% increase

    public const DISCLAIMER = 'Ini adalah indikasi awal berbasis data input, bukan diagnosis teknis atau bukti kerusakan alat.';

    public function __construct(
        private readonly FeatureGateService $featureGateService,
        private readonly ElectricityCalculator $calculator
    ) {}

    /**
     * Analyze anomalies for a business in a selected month.
     *
     * @param Business $business
     * @param string $selectedMonth Format: YYYY-MM
     * @return array
     */
    public function analyze(Business $business, string $selectedMonth): array
    {
        // Normalize month string to YYYY-MM
        $normalizedMonth = Carbon::parse($selectedMonth . '-01')->format('Y-m');

        // Fetch electricity entries sorted ascending
        $entries = $business->electricityEntries()
            ->orderBy('period_month', 'asc')
            ->get();

        // Safe grouping to handle duplicate periods (last one wins)
        $groupedEntries = [];
        foreach ($entries as $entry) {
            if (!$entry->period_month) {
                continue;
            }
            $m = Carbon::parse($entry->period_month)->format('Y-m');
            $groupedEntries[$m] = $entry;
        }

        // Sort keys chronologically
        ksort($groupedEntries);

        // Resolve tariff fallback from profile if needed
        $profileTariff = null;
        $profile = $business->electricityProfile;
        if ($profile && $profile->tariff_per_kwh !== null) {
            $profileTariff = (float) $profile->tariff_per_kwh;
        }

        // Map and resolve usage for all months
        $resolvedData = [];
        foreach ($groupedEntries as $m => $entry) {
            $usage = $entry->usage_kwh !== null ? (float) $entry->usage_kwh : null;
            $bill = $entry->bill_amount_idr !== null ? (float) $entry->bill_amount_idr : null;
            $tariff = $entry->tariff_per_kwh !== null ? (float) $entry->tariff_per_kwh : null;

            if ($tariff === null) {
                $tariff = $profileTariff;
            }

            // Derive usage if missing but bill and tariff are available
            if ($usage === null && $bill !== null && $tariff !== null && $tariff > 0.0) {
                $usage = $bill / $tariff;
            }

            $resolvedData[$m] = [
                'period_month' => $m,
                'usage_kwh' => $usage,
                'bill_amount_idr' => $bill,
                'tariff_per_kwh' => $tariff,
            ];
        }

        // Check if selected month exists in resolved data and has valid usage
        $hasData = isset($resolvedData[$normalizedMonth]) && $resolvedData[$normalizedMonth]['usage_kwh'] !== null;

        // Resolve user for subscription gate
        $user = $business->user;
        $isFullHistoryLocked = true;
        if ($user) {
            $isFullHistoryLocked = !$this->featureGateService->can($user, 'anomaly.history', $business);
        }

        if (!$hasData) {
            return $this->buildEmptyResponse($normalizedMonth, $resolvedData, $isFullHistoryLocked);
        }

        $observedUsage = (float) $resolvedData[$normalizedMonth]['usage_kwh'];
        $observedTariff = $resolvedData[$normalizedMonth]['tariff_per_kwh'];

        // Calculate baseline from historical months before selected month
        $historicalUsages = [];
        $allHistory = [];
        foreach ($resolvedData as $m => $data) {
            if ($m < $normalizedMonth) {
                if ($data['usage_kwh'] !== null) {
                    $historicalUsages[] = (float) $data['usage_kwh'];
                }
                $allHistory[] = $data;
            }
        }

        $historyCount = count($historicalUsages);
        $baselineUsage = null;
        if ($historyCount > 0) {
            $baselineUsage = array_sum($historicalUsages) / $historyCount;
        }

        // Calculations
        $differenceKwh = null;
        $differencePercent = null;
        $estimatedImpactIdr = null;
        $status = self::STATUS_NORMAL;

        if ($baselineUsage !== null) {
            $differenceKwh = $observedUsage - $baselineUsage;

            // Handle zero baseline
            if ($baselineUsage === 0.0) {
                if ($observedUsage === 0.0) {
                    $differencePercent = 0.0;
                } else {
                    $differencePercent = 100.0; // Deterministic jump
                }
            } else {
                $differencePercent = ($differenceKwh / $baselineUsage) * 100.0;
            }

            // Estimate Rupiah impact only when tariff is available
            if ($observedTariff !== null && $observedTariff > 0.0) {
                $estimatedImpactIdr = $this->calculator->estimateBillAmount($differenceKwh, $observedTariff);
            }

            // Determine status based on deterministic thresholds
            if ($differencePercent >= self::THRES_BOROS) {
                $status = self::STATUS_ANOMALY;
            } elseif ($differencePercent >= self::THRES_DICEK) {
                $status = self::STATUS_WARNING;
            } else {
                $status = self::STATUS_NORMAL;
            }
        }

        // Generate possible causes and recommended actions
        $possibleCauses = [];
        $recommendedActions = [];

        $isDetailedUnlocked = true;
        if ($user) {
            $isDetailedUnlocked = $this->featureGateService->can($user, 'anomaly.detailed', $business);
        }

        if ($isDetailedUnlocked) {
            if ($baselineUsage === null) {
                $possibleCauses = [];
                $recommendedActions = [];
            } elseif ($status === self::STATUS_ANOMALY || $status === self::STATUS_WARNING) {
                $possibleCauses = [
                    'Pemakaian tercatat mengalami peningkatan signifikan dibanding rata-rata historis. Berdasarkan data input.',
                    'Kemungkinan penyebab yang perlu dicek: peningkatan jam operasional atau penggunaan peralatan berdaya tinggi secara bersamaan.',
                    'Kemungkinan penyebab yang perlu dicek: kebocoran arus listrik minor. Perlu Verifikasi Manual.',
                ];
                $recommendedActions = [
                    'Bandingkan pemakaian tercatat dengan penggunaan riil di lapangan. Berdasarkan data input.',
                    'Lakukan pemeriksaan bertahap pada peralatan dengan daya besar. Perlu Verifikasi Manual.',
                ];
            } else {
                $possibleCauses = [
                    'Pemakaian tercatat berada dalam batas wajar. Berdasarkan data input.',
                ];
                $recommendedActions = [
                    'Pertahankan pola pemakaian saat ini. Berdasarkan data input.',
                ];
            }
        }

        // Lock history if subscription is FREE
        if ($isFullHistoryLocked) {
            $allHistory = array_slice($allHistory, -3);
        }

        // Build data requirements info
        $hasGaps = $this->detectGaps($resolvedData, $normalizedMonth);
        $needsMoreData = $historyCount < 1;

        $dataRequirements = [
            'history_months' => $historyCount,
            'has_gaps' => $hasGaps,
            'needs_more_data' => $needsMoreData,
            'message' => $needsMoreData
                ? 'Berdasarkan data input, Pemakaian tercatat memerlukan data historis minimal 1 bulan untuk perbandingan baseline. Perlu Verifikasi Manual jika terdapat indikasi ketidaksesuaian.'
                : 'Berdasarkan data input, data historis mencukupi. Perlu Verifikasi Manual untuk memvalidasi deviasi penggunaan.',
        ];

        return [
            'has_data' => true,
            'current_status' => $status,
            'baseline_usage_kwh' => $baselineUsage !== null ? round($baselineUsage, 2) : null,
            'observed_usage_kwh' => round($observedUsage, 2),
            'difference_kwh' => $differenceKwh !== null ? round($differenceKwh, 2) : null,
            'difference_percent' => $differencePercent !== null ? round($differencePercent, 2) : null,
            'estimated_impact_idr' => $estimatedImpactIdr !== null ? round($estimatedImpactIdr, 2) : null,
            'possible_causes' => $possibleCauses,
            'recommended_actions' => $recommendedActions,
            'selected_month' => $normalizedMonth,
            'history' => $allHistory,
            'is_full_history_locked' => $isFullHistoryLocked,
            'data_requirements' => $dataRequirements,
            'disclaimer' => self::DISCLAIMER,
        ];
    }

    /**
     * Build standard response for missing observed month data.
     */
    private function buildEmptyResponse(string $selectedMonth, array $resolvedData, bool $isFullHistoryLocked): array
    {
        $historicalUsages = [];
        $allHistory = [];
        foreach ($resolvedData as $m => $data) {
            if ($m < $selectedMonth) {
                if ($data['usage_kwh'] !== null) {
                    $historicalUsages[] = (float) $data['usage_kwh'];
                }
                $allHistory[] = $data;
            }
        }

        if ($isFullHistoryLocked) {
            $allHistory = array_slice($allHistory, -3);
        }

        $historyCount = count($historicalUsages);
        $baselineUsage = null;
        if ($historyCount > 0) {
            $baselineUsage = array_sum($historicalUsages) / $historyCount;
        }

        return [
            'has_data' => false,
            'current_status' => self::STATUS_NORMAL,
            'baseline_usage_kwh' => $baselineUsage !== null ? round($baselineUsage, 2) : null,
            'observed_usage_kwh' => null,
            'difference_kwh' => null,
            'difference_percent' => null,
            'estimated_impact_idr' => null,
            'possible_causes' => [],
            'recommended_actions' => [],
            'selected_month' => $selectedMonth,
            'history' => $allHistory,
            'is_full_history_locked' => $isFullHistoryLocked,
            'data_requirements' => [
                'history_months' => $historyCount,
                'has_gaps' => false,
                'needs_more_data' => true,
                'message' => 'Berdasarkan data input, Pemakaian tercatat untuk bulan terpilih tidak tersedia. Perlu Verifikasi Manual.',
            ],
            'disclaimer' => self::DISCLAIMER,
        ];
    }

    /**
     * Detect if there are gaps (skipped months) in history.
     */
    private function detectGaps(array $resolvedData, string $selectedMonth): bool
    {
        $months = array_keys($resolvedData);
        $months = array_filter($months, fn($m) => $m <= $selectedMonth);
        sort($months);

        if (count($months) < 2) {
            return false;
        }

        for ($i = 1; $i < count($months); $i++) {
            $prev = Carbon::parse($months[$i - 1] . '-01');
            $curr = Carbon::parse($months[$i] . '-01');
            if ($prev->diffInMonths($curr) > 1) {
                return true;
            }
        }

        return false;
    }
}
