<?php

namespace App\Services\Reports;

use App\Models\Business;
use App\Services\Electricity\ElectricityCalculator;
use App\Services\Appliances\ApplianceEstimator;
use App\Services\Recommendations\RecommendationService;
use App\Services\Recommendations\EfficiencyScoreService;
use Carbon\Carbon;

class MonthlyReportService
{
    public function __construct(
        private readonly ElectricityCalculator $electricityCalculator,
        private readonly ApplianceEstimator $applianceEstimator,
        private readonly RecommendationService $recommendationService,
        private readonly EfficiencyScoreService $efficiencyScoreService
    ) {}

    /**
     * Generate the monthly report summary.
     *
     * @param Business|null $business
     * @param string|null $selectedMonth
     * @return array
     */
    public function generate(?Business $business, ?string $selectedMonth = null): array
    {
        if ($business === null) {
            $currentMonth = Carbon::now()->format('Y-m');
            return [
                'business' => null,
                'selected_month' => $currentMonth,
                'available_months' => [],
                'data_completeness' => 'NO_BUSINESS',
                'electricity' => [
                    'usage_kwh' => null,
                    'bill_amount' => null,
                    'tariff_per_kwh' => null,
                    'data_status' => 'MISSING',
                ],
                'revenue' => [
                    'amount' => null,
                    'data_status' => 'MISSING',
                ],
                'financial_impact' => [
                    'electricity_revenue_ratio_percent' => null,
                    'remaining_revenue_after_electricity' => null,
                ],
                'appliances' => [
                    'count' => 0,
                    'top_candidates' => [],
                ],
                'recommendations' => [],
                'efficiency_score' => [
                    'score' => null,
                    'label' => 'Data belum cukup',
                    'status' => 'INCOMPLETE',
                    'confidence' => 'LOW',
                    'explanation' => 'Data tagihan listrik atau pendapatan bulan terbaru belum lengkap untuk menghitung skor efisiensi.',
                ],
                'disclaimers' => $this->getDisclaimers(),
            ];
        }

        $availableMonths = $this->getAvailableMonths($business);
        $normalizedMonth = $this->normalizeSelectedMonth($selectedMonth, $availableMonths);

        // Load Electricity Entry
        $electricityEntry = $business->electricityEntries()
            ->whereDate('period_month', $normalizedMonth . '-01')
            ->first();

        $usageKwh = $electricityEntry ? ($electricityEntry->usage_kwh !== null ? (float) $electricityEntry->usage_kwh : null) : null;
        $billAmount = $electricityEntry ? ($electricityEntry->bill_amount_idr !== null ? (float) $electricityEntry->bill_amount_idr : null) : null;

        $tariffPerKwh = null;
        if ($electricityEntry && $electricityEntry->tariff_per_kwh !== null) {
            $tariffPerKwh = (float) $electricityEntry->tariff_per_kwh;
        } else {
            $profile = $business->electricityProfile;
            if ($profile && $profile->tariff_per_kwh !== null) {
                $tariffPerKwh = (float) $profile->tariff_per_kwh;
            }
        }

        // Load Revenue Entry
        $revenueEntry = $business->revenueEntries()
            ->whereDate('period_month', $normalizedMonth . '-01')
            ->first();

        $revenueAmount = $revenueEntry ? ($revenueEntry->revenue_amount_idr !== null ? (float) $revenueEntry->revenue_amount_idr : null) : null;

        // Financial Impact
        $electricityCostForImpact = $billAmount;
        if ($electricityCostForImpact === null && $usageKwh !== null && $tariffPerKwh !== null) {
            $electricityCostForImpact = $this->electricityCalculator->estimateBillAmount($usageKwh, $tariffPerKwh);
        }

        $ratio = null;
        $remaining = null;
        if ($electricityCostForImpact !== null && $revenueAmount !== null) {
            $ratio = $this->electricityCalculator->calculateElectricityRevenueRatio($electricityCostForImpact, $revenueAmount);
            $remaining = $this->electricityCalculator->calculateRemainingRevenueAfterElectricity($revenueAmount, $electricityCostForImpact);
        }

        // Appliances
        $appliances = $business->appliances()->get();
        $applianceCount = $appliances->count();
        $candidates = [];

        foreach ($appliances as $appliance) {
            $watt = $appliance->watt !== null ? (float) $appliance->watt : null;
            $qty = $appliance->quantity;
            $hours = $appliance->hours_per_day !== null ? (float) $appliance->hours_per_day : null;
            $days = $appliance->days_per_month;

            $estimatedKwh = $this->applianceEstimator->estimateMonthlyKwh($watt, $qty, $hours, $days);
            $estimatedCost = null;
            if ($estimatedKwh !== null && $tariffPerKwh !== null) {
                $estimatedCost = $this->applianceEstimator->estimateMonthlyCost($estimatedKwh, $tariffPerKwh);
            }

            $rankingReason = $this->applianceEstimator->getRankingReason($watt, $qty, $hours);

            $candidates[] = [
                'id' => $appliance->id,
                'name' => $appliance->name,
                'category' => $appliance->category,
                'estimated_monthly_kwh' => $estimatedKwh,
                'estimated_monthly_cost' => $estimatedCost,
                'ranking_reason' => $rankingReason,
                'badges' => [
                    'Estimasi Simulatif',
                    'Berdasarkan data input',
                    'Perlu Verifikasi Manual',
                ],
            ];
        }

        usort($candidates, function ($a, $b) {
            $kwhA = $a['estimated_monthly_kwh'] ?? 0.0;
            $kwhB = $b['estimated_monthly_kwh'] ?? 0.0;
            $diff = $kwhB <=> $kwhA;
            if ($diff !== 0) {
                return $diff;
            }
            $nameA = $a['name'] ?? '';
            $nameB = $b['name'] ?? '';
            $nameDiff = strcmp($nameA, $nameB);
            if ($nameDiff !== 0) {
                return $nameDiff;
            }
            return $a['id'] <=> $b['id'];
        });

        $topCandidates = array_slice($candidates, 0, 3);

        // Recommendations (Limit to 5)
        $recommendations = $this->recommendationService->getTopRecommendationsForBusiness($business, 5);

        // Efficiency Score
        $efficiencyScore = $this->efficiencyScoreService->calculateForBusiness($business);

        // Data Completeness Status
        $dataCompleteness = $this->resolveDataCompleteness($electricityEntry, $revenueEntry, $applianceCount);

        return [
            'business' => [
                'id' => $business->id,
                'name' => $business->name,
                'business_type' => $business->business_type,
            ],
            'selected_month' => $normalizedMonth,
            'available_months' => $availableMonths,
            'data_completeness' => $dataCompleteness,
            'electricity' => [
                'usage_kwh' => $usageKwh,
                'bill_amount' => $billAmount,
                'tariff_per_kwh' => $tariffPerKwh,
                'data_status' => $electricityEntry ? 'AVAILABLE' : 'MISSING',
            ],
            'revenue' => [
                'amount' => $revenueAmount,
                'data_status' => $revenueEntry ? 'AVAILABLE' : 'MISSING',
            ],
            'financial_impact' => [
                'electricity_revenue_ratio_percent' => $ratio,
                'remaining_revenue_after_electricity' => $remaining,
            ],
            'appliances' => [
                'count' => $applianceCount,
                'top_candidates' => $topCandidates,
            ],
            'recommendations' => $recommendations,
            'efficiency_score' => $efficiencyScore,
            'disclaimers' => $this->getDisclaimers(),
        ];
    }

    /**
     * Get list of unique available months.
     *
     * @param Business $business
     * @return array
     */
    public function getAvailableMonths(Business $business): array
    {
        $electricityMonths = $business->electricityEntries()
            ->pluck('period_month')
            ->map(function ($date) {
                if (!$date) return null;
                return Carbon::parse($date)->format('Y-m');
            })
            ->filter()
            ->toArray();

        $revenueMonths = $business->revenueEntries()
            ->pluck('period_month')
            ->map(function ($date) {
                if (!$date) return null;
                return Carbon::parse($date)->format('Y-m');
            })
            ->filter()
            ->toArray();

        $allMonths = array_unique(array_merge($electricityMonths, $revenueMonths));
        rsort($allMonths);

        return array_values($allMonths);
    }

    /**
     * Normalize selected month to YYYY-MM format, falling back safely if invalid.
     *
     * @param string|null $selectedMonth
     * @param array $availableMonths
     * @return string
     */
    public function normalizeSelectedMonth(?string $selectedMonth, array $availableMonths): string
    {
        if ($this->isValidMonth($selectedMonth)) {
            return $selectedMonth;
        }

        if (!empty($availableMonths)) {
            return $availableMonths[0];
        }

        return Carbon::now()->format('Y-m');
    }

    /**
     * Check if string is in valid YYYY-MM format.
     */
    private function isValidMonth(?string $month): bool
    {
        if (!$month) {
            return false;
        }

        if (preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $month) !== 1) {
            return false;
        }

        try {
            Carbon::createFromFormat('Y-m', $month);
            return true;
        } catch (\Exception) {
            return false;
        }
    }

    /**
     * Resolve the data completeness status based on available records.
     */
    private function resolveDataCompleteness($electricityEntry, $revenueEntry, int $applianceCount): string
    {
        $hasElectricity = ($electricityEntry !== null);
        $hasRevenue = ($revenueEntry !== null);
        $hasAppliances = ($applianceCount > 0);

        if ($hasElectricity && $hasRevenue && $hasAppliances) {
            return 'COMPLETE';
        }

        if (!$hasElectricity && $hasRevenue) {
            return 'NO_ELECTRICITY';
        }

        if ($hasElectricity && !$hasRevenue) {
            return 'NO_REVENUE';
        }

        if ($hasElectricity && $hasRevenue && !$hasAppliances) {
            return 'NO_APPLIANCES';
        }

        return 'PARTIAL';
    }

    /**
     * Get the static safe disclaimers.
     */
    private function getDisclaimers(): array
    {
        return [
            'Prediksi dan estimasi WattWise AI bersifat perkiraan berdasarkan data yang dimasukkan pengguna dan bukan tagihan resmi PLN.',
            'WattWise AI bukan aplikasi resmi PLN, bukan pengganti PLN Mobile, dan bukan alat ukur listrik resmi.',
            'Perhitungan peralatan berdasarkan data daya dan jam pakai yang Anda input. Tanpa sensor, WattWise AI tidak mengukur konsumsi aktual tiap alat.',
            'Sisa pendapatan setelah listrik belum memperhitungkan biaya operasional lain seperti bahan baku, gaji, sewa, air, internet, dan biaya lainnya.'
        ];
    }
}
