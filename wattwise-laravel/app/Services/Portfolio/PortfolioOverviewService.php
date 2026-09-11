<?php

namespace App\Services\Portfolio;

use App\Models\Business;
use App\Models\User;
use App\Services\Anomalies\AnomalyService;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class PortfolioOverviewService
{
    public const LABEL_AMAN = 'Aman';

    public const LABEL_PERLU_DICEK = 'Perlu Dicek';

    public const LABEL_PERLU_PERHATIAN = 'Perlu Perhatian';

    public const LABEL_DATA_BELUM_LENGKAP = 'Data Belum Lengkap';

    public const DISCLAIMER = 'Indikasi ini berdasarkan data yang dicatat di WattWise dan bukan diagnosis teknis instalasi listrik.';

    /**
     * Business type labels in Indonesian.
     */
    public const BUSINESS_TYPES = [
        'KOS_PROPERTY' => 'Kos / Properti',
        'FNB' => 'Makanan & Minuman',
        'LAUNDRY' => 'Laundry',
        'RETAIL' => 'Ritel',
        'COLD_STORAGE' => 'Penyimpanan Dingin',
        'OTHER' => 'Lainnya',
    ];

    /**
     * Indonesian month abbreviations for display.
     */
    private const ID_MONTHS = [
        1 => 'Jan', 2 => 'Feb', 3 => 'Mar', 4 => 'Apr',
        5 => 'Mei', 6 => 'Jun', 7 => 'Jul', 8 => 'Agu',
        9 => 'Sep', 10 => 'Okt', 11 => 'Nov', 12 => 'Des',
    ];

    /**
     * Build the multi-location portfolio overview for the given user.
     *
     * @param  string|null  $requestedMonth  Format: YYYY-MM
     */
    public function getOverview(User $user, ?string $requestedMonth = null): array
    {
        // 1. Batch load active businesses with relations (Zero N+1)
        $businesses = $user->businesses()
            ->active()
            ->with([
                'electricityProfile',
                'electricityEntries' => fn ($q) => $q->orderBy('period_month', 'asc'),
                'revenueEntries' => fn ($q) => $q->orderBy('period_month', 'asc'),
            ])
            ->get();

        $activeLocationCount = $businesses->count();

        // 2. Resolve selected month
        $selectedMonth = $this->resolveSelectedMonth($businesses, $requestedMonth);
        $previousMonth = Carbon::parse($selectedMonth.'-01')->subMonth()->format('Y-m');

        // 3. Process each business data for selected month, previous month, and baseline
        $locationRows = [];
        $totalUsageSelected = 0.0;
        $totalCostSelected = 0.0;
        $totalRevenueSelected = 0.0;

        $locationsWithElectricity = 0;
        $locationsWithRevenue = 0;

        $safeCount = 0;
        $checkCount = 0;
        $attentionCount = 0;
        $incompleteCount = 0;

        $attentionCandidates = [];

        // For MoM comparable metrics
        $comparableCostCurrent = 0.0;
        $comparableCostPrevious = 0.0;
        $comparableUsageCurrent = 0.0;
        $comparableUsagePrevious = 0.0;
        $comparableElectricityCount = 0;

        $comparableRevenueCurrent = 0.0;
        $comparableRevenuePrevious = 0.0;
        $comparableRevenueCount = 0;

        foreach ($businesses as $business) {
            $processed = $this->processBusiness($business, $selectedMonth, $previousMonth);
            $locationRows[] = $processed['row'];

            // Aggregation for selected month
            if ($processed['has_electricity_selected']) {
                $locationsWithElectricity++;
                $totalUsageSelected += $processed['current_usage_kwh'] ?? 0.0;
                $totalCostSelected += $processed['current_cost_idr'] ?? 0.0;
            }

            if ($processed['has_revenue_selected']) {
                $locationsWithRevenue++;
                $totalRevenueSelected += $processed['current_revenue_idr'] ?? 0.0;
            }

            // Health counter
            switch ($processed['health_status']) {
                case self::LABEL_AMAN:
                    $safeCount++;
                    break;
                case self::LABEL_PERLU_DICEK:
                    $checkCount++;
                    $attentionCandidates[] = $processed['attention_item'];
                    break;
                case self::LABEL_PERLU_PERHATIAN:
                    $attentionCount++;
                    $attentionCandidates[] = $processed['attention_item'];
                    break;
                case self::LABEL_DATA_BELUM_LENGKAP:
                    $incompleteCount++;
                    $attentionCandidates[] = $processed['attention_item'];
                    break;
            }

            // MoM comparability
            if ($processed['is_comparable_electricity']) {
                $comparableElectricityCount++;
                $comparableCostCurrent += $processed['current_cost_idr'];
                $comparableCostPrevious += $processed['previous_cost_idr'];
                $comparableUsageCurrent += $processed['current_usage_kwh'];
                $comparableUsagePrevious += $processed['previous_usage_kwh'];
            }

            if ($processed['is_comparable_revenue']) {
                $comparableRevenueCount++;
                $comparableRevenueCurrent += $processed['current_revenue_idr'];
                $comparableRevenuePrevious += $processed['previous_revenue_idr'];
            }
        }

        // 4. Sort and limit attention items (Max 5 items)
        $sortedAttentionItems = $this->sortAttentionItems($attentionCandidates);

        // 5. Calculate summary ratios and coverage
        $electricityCoveragePercent = $activeLocationCount > 0
            ? round(($locationsWithElectricity / $activeLocationCount) * 100, 1)
            : 0.0;

        $revenueCoveragePercent = $activeLocationCount > 0
            ? round(($locationsWithRevenue / $activeLocationCount) * 100, 1)
            : 0.0;

        $ratioPercent = null;
        if ($locationsWithRevenue > 0 && $totalRevenueSelected > 0) {
            $ratioPercent = round(($totalCostSelected / $totalRevenueSelected) * 100, 1);
        }

        // 6. Calculate MoM percentage comparisons (comparable only)
        $costChangePercent = null;
        $usageChangePercent = null;
        $costDifferenceIdr = null;
        if ($comparableElectricityCount > 0) {
            $costDifferenceIdr = round($comparableCostCurrent - $comparableCostPrevious, 2);
            if ($comparableCostPrevious > 0) {
                $costChangePercent = round((($comparableCostCurrent - $comparableCostPrevious) / $comparableCostPrevious) * 100, 1);
            }
            if ($comparableUsagePrevious > 0) {
                $usageChangePercent = round((($comparableUsageCurrent - $comparableUsagePrevious) / $comparableUsagePrevious) * 100, 1);
            }
        }

        $revenueChangePercent = null;
        if ($comparableRevenueCount > 0 && $comparableRevenuePrevious > 0) {
            $revenueChangePercent = round((($comparableRevenueCurrent - $comparableRevenuePrevious) / $comparableRevenuePrevious) * 100, 1);
        }

        // 7. Build 6-month historical portfolio trend
        $trend = $this->buildPortfolioTrend($businesses, $selectedMonth);

        // 8. Available selectable months
        $availableMonths = $this->buildAvailableMonths($businesses, $selectedMonth);

        // 9. Explanatory health copy
        $healthExplanation = $this->buildHealthExplanation($safeCount, $checkCount, $attentionCount, $incompleteCount);

        return [
            'selected_month' => $selectedMonth,
            'selected_month_label' => $this->formatMonthLabel($selectedMonth),
            'previous_month' => $previousMonth,
            'previous_month_label' => $this->formatMonthLabel($previousMonth),
            'available_months' => $availableMonths,

            'summary' => [
                'active_business_count' => $activeLocationCount,
                'businesses_with_electricity_data' => $locationsWithElectricity,
                'businesses_with_revenue_data' => $locationsWithRevenue,
                'electricity_coverage_percent' => $electricityCoveragePercent,
                'revenue_coverage_percent' => $revenueCoveragePercent,
                'total_usage_kwh' => round($totalUsageSelected, 2),
                'total_electricity_cost_idr' => round($totalCostSelected, 2),
                'total_revenue_idr' => $locationsWithRevenue > 0 ? round($totalRevenueSelected, 2) : null,
                'electricity_revenue_ratio_percent' => $ratioPercent,
            ],

            'comparison' => [
                'comparable_business_count' => $comparableElectricityCount,
                'total_active_businesses' => $activeLocationCount,
                'is_partial_comparison' => $comparableElectricityCount < $activeLocationCount,
                'cost_difference_idr' => $costDifferenceIdr,
                'electricity_cost_change_percent' => $costChangePercent,
                'usage_change_percent' => $usageChangePercent,
                'comparable_revenue_business_count' => $comparableRevenueCount,
                'revenue_change_percent' => $revenueChangePercent,
            ],

            'health' => [
                'safe_count' => $safeCount,
                'check_count' => $checkCount,
                'attention_count' => $attentionCount,
                'incomplete_count' => $incompleteCount,
                'explanation' => $healthExplanation,
                'disclaimer' => self::DISCLAIMER,
            ],

            'attention_items' => $sortedAttentionItems,

            'locations' => $locationRows,

            'trend' => $trend,
        ];
    }

    /**
     * Process individual business metrics, health, and MoM row.
     */
    private function processBusiness(Business $business, string $selectedMonth, string $previousMonth): array
    {
        $profileTariff = $business->electricityProfile?->tariff_per_kwh !== null
            ? (float) $business->electricityProfile->tariff_per_kwh
            : null;

        // Map entries by YYYY-MM
        $electricityByMonth = [];
        foreach ($business->electricityEntries as $entry) {
            if (! $entry->period_month) {
                continue;
            }
            $m = Carbon::parse($entry->period_month)->format('Y-m');
            $electricityByMonth[$m] = $entry;
        }

        $revenueByMonth = [];
        foreach ($business->revenueEntries as $entry) {
            if (! $entry->period_month) {
                continue;
            }
            $m = Carbon::parse($entry->period_month)->format('Y-m');
            $revenueByMonth[$m] = $entry;
        }

        // Current month resolution
        $currentElec = $electricityByMonth[$selectedMonth] ?? null;
        $currentRev = $revenueByMonth[$selectedMonth] ?? null;

        $currentUsage = null;
        $currentCost = null;
        $currentTariff = null;

        if ($currentElec) {
            $currentUsage = $currentElec->usage_kwh !== null ? (float) $currentElec->usage_kwh : null;
            $currentCost = $currentElec->bill_amount_idr !== null ? (float) $currentElec->bill_amount_idr : null;
            $currentTariff = $currentElec->tariff_per_kwh !== null ? (float) $currentElec->tariff_per_kwh : $profileTariff;

            // Bill fallback
            if ($currentCost === null && $currentUsage !== null && $currentTariff !== null && $currentTariff > 0) {
                $currentCost = $currentUsage * $currentTariff;
            }

            // Usage derivation fallback
            if ($currentUsage === null && $currentCost !== null && $currentTariff !== null && $currentTariff > 0) {
                $currentUsage = $currentCost / $currentTariff;
            }
        }

        $currentRevenue = $currentRev?->revenue_amount_idr !== null ? (float) $currentRev->revenue_amount_idr : null;

        // Previous month resolution
        $prevElec = $electricityByMonth[$previousMonth] ?? null;
        $prevRev = $revenueByMonth[$previousMonth] ?? null;

        $previousUsage = null;
        $previousCost = null;
        $prevTariff = null;

        if ($prevElec) {
            $previousUsage = $prevElec->usage_kwh !== null ? (float) $prevElec->usage_kwh : null;
            $previousCost = $prevElec->bill_amount_idr !== null ? (float) $prevElec->bill_amount_idr : null;
            $prevTariff = $prevElec->tariff_per_kwh !== null ? (float) $prevElec->tariff_per_kwh : $profileTariff;

            if ($previousCost === null && $previousUsage !== null && $prevTariff !== null && $prevTariff > 0) {
                $previousCost = $previousUsage * $prevTariff;
            }

            if ($previousUsage === null && $previousCost !== null && $prevTariff !== null && $prevTariff > 0) {
                $previousUsage = $previousCost / $prevTariff;
            }
        }

        $previousRevenue = $prevRev?->revenue_amount_idr !== null ? (float) $prevRev->revenue_amount_idr : null;

        // Calculate baseline from all months before selectedMonth
        $historicalUsages = [];
        foreach ($electricityByMonth as $m => $entry) {
            if ($m < $selectedMonth) {
                $u = $entry->usage_kwh !== null ? (float) $entry->usage_kwh : null;
                $t = $entry->tariff_per_kwh !== null ? (float) $entry->tariff_per_kwh : $profileTariff;
                $b = $entry->bill_amount_idr !== null ? (float) $entry->bill_amount_idr : null;

                if ($u === null && $b !== null && $t !== null && $t > 0) {
                    $u = $b / $t;
                }

                if ($u !== null) {
                    $historicalUsages[] = $u;
                }
            }
        }

        $historyCount = count($historicalUsages);
        $baselineUsage = $historyCount > 0 ? (array_sum($historicalUsages) / $historyCount) : null;

        // Health evaluation
        $healthStatus = self::LABEL_AMAN;
        $healthDescription = 'Pemakaian masih berada dalam pola yang wajar berdasarkan data yang tersedia.';
        $differencePercent = null;
        $differenceKwh = null;
        $estimatedImpactIdr = null;

        $hasElectricitySelected = ($currentUsage !== null || $currentCost !== null);
        $hasRevenueSelected = ($currentRevenue !== null);

        if (! $hasElectricitySelected) {
            $healthStatus = self::LABEL_DATA_BELUM_LENGKAP;
            $healthDescription = 'Data bulan ini belum cukup untuk menilai kondisi lokasi.';
        } elseif ($baselineUsage !== null && $currentUsage !== null) {
            $differenceKwh = $currentUsage - $baselineUsage;

            if ($baselineUsage === 0.0) {
                $differencePercent = $currentUsage === 0.0 ? 0.0 : 100.0;
            } else {
                $differencePercent = ($differenceKwh / $baselineUsage) * 100.0;
            }

            if ($currentTariff !== null && $currentTariff > 0 && $differenceKwh > 0) {
                $estimatedImpactIdr = $differenceKwh * $currentTariff;
            }

            // Reuse authoritative AnomalyService thresholds
            if ($differencePercent >= AnomalyService::THRES_BOROS) {
                $healthStatus = self::LABEL_PERLU_PERHATIAN;
                $healthDescription = 'Pemakaian meningkat cukup besar dibanding pola sebelumnya.';
            } elseif ($differencePercent >= AnomalyService::THRES_DICEK) {
                $healthStatus = self::LABEL_PERLU_DICEK;
                $healthDescription = 'Pemakaian meningkat dibanding pola sebelumnya. Ada baiknya lokasi ini diperiksa.';
            } else {
                $healthStatus = self::LABEL_AMAN;
                $healthDescription = 'Pemakaian masih berada dalam pola yang wajar berdasarkan data yang tersedia.';
            }
        }

        // MoM Cost Difference for this location
        $locationCostChangePercent = null;
        if ($currentCost !== null && $previousCost !== null && $previousCost > 0) {
            $locationCostChangePercent = round((($currentCost - $previousCost) / $previousCost) * 100, 1);
        }

        // Revenue MoM for this location
        $locationRevenueChangePercent = null;
        if ($currentRevenue !== null && $previousRevenue !== null && $previousRevenue > 0) {
            $locationRevenueChangePercent = round((($currentRevenue - $previousRevenue) / $previousRevenue) * 100, 1);
        }

        // Cost vs Revenue context (Section 12)
        $costVsRevenueInsight = null;
        if ($locationCostChangePercent !== null && $locationRevenueChangePercent !== null) {
            $gap = $locationCostChangePercent - $locationRevenueChangePercent;
            if ($gap > 5.0 && $locationCostChangePercent > 0) {
                $costVsRevenueInsight = 'Biaya listrik naik lebih cepat daripada pendapatan.';
            }
        }

        // Build attention item data if non-normal
        $attentionItem = null;
        if ($healthStatus !== self::LABEL_AMAN) {
            $reason = match ($healthStatus) {
                self::LABEL_PERLU_PERHATIAN => sprintf('Pemakaian listrik %.0f%% lebih tinggi dari pola sebelumnya.', abs($differencePercent ?? 0)),
                self::LABEL_PERLU_DICEK => sprintf('Pemakaian listrik %.0f%% lebih tinggi dari pola sebelumnya.', abs($differencePercent ?? 0)),
                self::LABEL_DATA_BELUM_LENGKAP => 'Pemakaian listrik bulan ini belum dicatat.',
                default => '',
            };

            $magnitude = null;
            if ($differencePercent !== null) {
                $sign = $differencePercent > 0 ? '+' : '';
                $magnitude = sprintf('%s%.1f%% (%s%.1f kWh)', $sign, $differencePercent, $sign, $differenceKwh);
            }

            $attentionItem = [
                'business_id' => $business->id,
                'business_name' => $business->name,
                'business_type' => $business->business_type,
                'business_type_label' => self::BUSINESS_TYPES[$business->business_type] ?? 'Lainnya',
                'city' => $business->city,
                'status' => $healthStatus,
                'reason' => $reason,
                'magnitude' => $magnitude,
                'difference_percent' => $differencePercent !== null ? round($differencePercent, 1) : null,
                'difference_kwh' => $differenceKwh !== null ? round($differenceKwh, 1) : null,
                'estimated_impact_idr' => $estimatedImpactIdr !== null ? round($estimatedImpactIdr, 0) : null,
                'cta_label' => $healthStatus === self::LABEL_DATA_BELUM_LENGKAP ? 'Lengkapi Data' : 'Lihat Lokasi',
            ];
        }

        $row = [
            'id' => $business->id,
            'name' => $business->name,
            'business_type' => $business->business_type,
            'business_type_label' => self::BUSINESS_TYPES[$business->business_type] ?? 'Lainnya',
            'city' => $business->city,
            'usage_kwh' => $currentUsage !== null ? round($currentUsage, 2) : null,
            'cost_idr' => $currentCost !== null ? round($currentCost, 2) : null,
            'revenue_idr' => $currentRevenue !== null ? round($currentRevenue, 2) : null,
            'cost_change_percent' => $locationCostChangePercent,
            'revenue_change_percent' => $locationRevenueChangePercent,
            'cost_vs_revenue_insight' => $costVsRevenueInsight,
            'status' => $healthStatus,
            'status_description' => $healthDescription,
            'has_electricity' => $hasElectricitySelected,
            'has_revenue' => $hasRevenueSelected,
            'difference_percent' => $differencePercent !== null ? round($differencePercent, 1) : null,
            'estimated_impact_idr' => $estimatedImpactIdr !== null ? round($estimatedImpactIdr, 0) : null,
        ];

        return [
            'row' => $row,
            'health_status' => $healthStatus,
            'has_electricity_selected' => $hasElectricitySelected,
            'has_revenue_selected' => $hasRevenueSelected,
            'current_usage_kwh' => $currentUsage,
            'current_cost_idr' => $currentCost,
            'current_revenue_idr' => $currentRevenue,
            'previous_usage_kwh' => $previousUsage,
            'previous_cost_idr' => $previousCost,
            'previous_revenue_idr' => $previousRevenue,
            'is_comparable_electricity' => ($currentCost !== null && $previousCost !== null),
            'is_comparable_revenue' => ($currentRevenue !== null && $previousRevenue !== null),
            'attention_item' => $attentionItem,
        ];
    }

    /**
     * Sort attention items by severity and magnitude, capped at 5 items.
     */
    private function sortAttentionItems(array $items): array
    {
        // Severity rank: Perlu Perhatian (1) > Perlu Dicek (2) > Data Belum Lengkap (3)
        $severityRank = [
            self::LABEL_PERLU_PERHATIAN => 1,
            self::LABEL_PERLU_DICEK => 2,
            self::LABEL_DATA_BELUM_LENGKAP => 3,
        ];

        usort($items, function ($a, $b) use ($severityRank) {
            $rankA = $severityRank[$a['status']] ?? 99;
            $rankB = $severityRank[$b['status']] ?? 99;

            if ($rankA !== $rankB) {
                return $rankA <=> $rankB;
            }

            // Within same severity, sort by descending difference_percent or estimated impact
            $diffA = $a['difference_percent'] ?? 0.0;
            $diffB = $b['difference_percent'] ?? 0.0;
            if ($diffA !== $diffB) {
                return $diffB <=> $diffA;
            }

            $impactA = $a['estimated_impact_idr'] ?? 0.0;
            $impactB = $b['estimated_impact_idr'] ?? 0.0;

            return $impactB <=> $impactA;
        });

        return array_slice($items, 0, 5);
    }

    /**
     * Build 6-month historical portfolio trend ending at selectedMonth.
     */
    private function buildPortfolioTrend(Collection $businesses, string $selectedMonth): array
    {
        $selectedDate = Carbon::parse($selectedMonth.'-01');
        $activeCount = $businesses->count();

        // Generate 6 months ascending (5 months prior up to selectedMonth)
        $months = [];
        for ($i = 5; $i >= 0; $i--) {
            $m = (clone $selectedDate)->subMonths($i)->format('Y-m');
            $months[] = $m;
        }

        $trend = [];
        foreach ($months as $m) {
            $totalCost = 0.0;
            $totalUsage = 0.0;
            $totalRevenue = 0.0;
            $locationsWithElec = 0;
            $locationsWithRev = 0;

            foreach ($businesses as $b) {
                $profileTariff = $b->electricityProfile?->tariff_per_kwh !== null
                    ? (float) $b->electricityProfile->tariff_per_kwh
                    : null;

                // Find electricity entry for month $m
                $entry = $b->electricityEntries->first(function ($e) use ($m) {
                    return $e->period_month && Carbon::parse($e->period_month)->format('Y-m') === $m;
                });

                if ($entry) {
                    $u = $entry->usage_kwh !== null ? (float) $entry->usage_kwh : null;
                    $c = $entry->bill_amount_idr !== null ? (float) $entry->bill_amount_idr : null;
                    $t = $entry->tariff_per_kwh !== null ? (float) $entry->tariff_per_kwh : $profileTariff;

                    if ($c === null && $u !== null && $t !== null && $t > 0) {
                        $c = $u * $t;
                    }
                    if ($u === null && $c !== null && $t !== null && $t > 0) {
                        $u = $c / $t;
                    }

                    if ($u !== null || $c !== null) {
                        $locationsWithElec++;
                        $totalUsage += $u ?? 0.0;
                        $totalCost += $c ?? 0.0;
                    }
                }

                // Find revenue entry for month $m
                $revEntry = $b->revenueEntries->first(function ($r) use ($m) {
                    return $r->period_month && Carbon::parse($r->period_month)->format('Y-m') === $m;
                });

                if ($revEntry && $revEntry->revenue_amount_idr !== null) {
                    $locationsWithRev++;
                    $totalRevenue += (float) $revEntry->revenue_amount_idr;
                }
            }

            $coveragePercent = $activeCount > 0
                ? round(($locationsWithElec / $activeCount) * 100, 1)
                : 0.0;

            $trend[] = [
                'month' => $m,
                'month_label' => $this->formatMonthLabel($m),
                'total_cost_idr' => round($totalCost, 2),
                'total_usage_kwh' => round($totalUsage, 2),
                'total_revenue_idr' => $locationsWithRev > 0 ? round($totalRevenue, 2) : null,
                'business_count_with_data' => $locationsWithElec,
                'business_count_with_revenue' => $locationsWithRev,
                'total_business_count' => $activeCount,
                'coverage_percent' => $coveragePercent,
            ];
        }

        return $trend;
    }

    /**
     * Resolve latest month with data or requested month.
     */
    private function resolveSelectedMonth(Collection $businesses, ?string $requestedMonth): string
    {
        if ($requestedMonth) {
            try {
                return Carbon::parse($requestedMonth.'-01')->format('Y-m');
            } catch (\Throwable) {
                // Ignore parsing error and fallback
            }
        }

        // Find latest month across all electricity entries
        $latest = null;
        foreach ($businesses as $b) {
            foreach ($b->electricityEntries as $e) {
                if (! $e->period_month) {
                    continue;
                }
                $m = Carbon::parse($e->period_month)->format('Y-m');
                if ($latest === null || $m > $latest) {
                    $latest = $m;
                }
            }
        }

        return $latest ?? Carbon::now()->format('Y-m');
    }

    /**
     * Build selectable months list (all available historical months plus current).
     */
    private function buildAvailableMonths(Collection $businesses, string $selectedMonth): array
    {
        $months = [];
        foreach ($businesses as $b) {
            foreach ($b->electricityEntries as $e) {
                if ($e->period_month) {
                    $months[Carbon::parse($e->period_month)->format('Y-m')] = true;
                }
            }
            foreach ($b->revenueEntries as $r) {
                if ($r->period_month) {
                    $months[Carbon::parse($r->period_month)->format('Y-m')] = true;
                }
            }
        }

        $months[$selectedMonth] = true;
        $months[Carbon::now()->format('Y-m')] = true;

        $sorted = array_keys($months);
        rsort($sorted);

        return array_map(function ($m) {
            return [
                'value' => $m,
                'label' => $this->formatMonthLabel($m),
            ];
        }, $sorted);
    }

    /**
     * Build plain-language health explanation copy.
     */
    private function buildHealthExplanation(int $safe, int $check, int $attention, int $incomplete): string
    {
        $issues = $check + $attention;
        if ($issues === 0 && $incomplete === 0) {
            return 'Seluruh lokasi berjalan normal dalam batas wajar pemakaian.';
        }

        if ($issues === 0 && $incomplete > 0) {
            return sprintf('Seluruh lokasi yang tercatat terpantau aman. Terdapat %d lokasi dengan data belum lengkap.', $incomplete);
        }

        if ($attention > 0 && $check > 0) {
            return sprintf('Sebagian besar lokasi terpantau. Ada %d lokasi perlu perhatian dan %d lokasi perlu dicek.', $attention, $check);
        }

        if ($attention > 0) {
            return sprintf('Ada %d lokasi yang memerlukan perhatian segera akibat lonjakan pemakaian.', $attention);
        }

        return sprintf('Ada %d lokasi yang sebaiknya Anda periksa polanya bulan ini.', $check);
    }

    /**
     * Format YYYY-MM to Indonesian string (e.g. 'Jul 2026').
     */
    private function formatMonthLabel(string $monthStr): string
    {
        try {
            $d = Carbon::parse($monthStr.'-01');
            $monthName = self::ID_MONTHS[$d->month] ?? $d->format('M');

            return $monthName.' '.$d->year;
        } catch (\Throwable) {
            return $monthStr;
        }
    }
}
