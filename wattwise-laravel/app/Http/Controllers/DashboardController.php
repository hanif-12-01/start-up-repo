<?php

namespace App\Http\Controllers;

use App\Services\Electricity\ElectricityCalculator;
use App\Services\Appliances\ApplianceEstimator;
use App\Services\Recommendations\RecommendationService;
use App\Services\Recommendations\EfficiencyScoreService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

use App\Services\Predictions\PredictionService;
use App\Services\FeatureGateService;

class DashboardController extends Controller
{
    protected ElectricityCalculator $calculator;
    protected ApplianceEstimator $applianceEstimator;
    protected RecommendationService $recommendationService;
    protected EfficiencyScoreService $efficiencyScoreService;
    protected PredictionService $predictionService;
    protected FeatureGateService $featureGateService;

    public function __construct(
        ElectricityCalculator $calculator,
        ApplianceEstimator $applianceEstimator,
        RecommendationService $recommendationService,
        EfficiencyScoreService $efficiencyScoreService,
        PredictionService $predictionService,
        FeatureGateService $featureGateService
    ) {
        $this->calculator = $calculator;
        $this->applianceEstimator = $applianceEstimator;
        $this->recommendationService = $recommendationService;
        $this->efficiencyScoreService = $efficiencyScoreService;
        $this->predictionService = $predictionService;
        $this->featureGateService = $featureGateService;
    }

    /**
     * Display the dashboard.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $businesses = $user ? $user->businesses()->active()->get() : collect();
        $activeBusiness = null;
        $businessCount = $businesses->count();
        $hasBusiness = $businessCount > 0;

        $latestElectricityEntry = null;
        $latestRevenueEntry = null;

        $electricityCostIdr = null;
        $usageKwh = null;
        $tariffPerKwh = null;
        $revenueAmountIdr = null;
        $electricityRevenueRatioPercent = null;
        $remainingRevenueAfterElectricity = null;

        if ($hasBusiness) {
            $activeBusinessId = $request->query('business_id');
            if ($activeBusinessId) {
                $activeBusiness = $businesses->firstWhere('id', $activeBusinessId);
            }
            if (!$activeBusiness) {
                $activeBusiness = $businesses->first();
            }

            if ($activeBusiness) {
                // Get latest monthly entries
                $latestElectricityEntry = $activeBusiness->electricityEntries()
                    ->orderBy('period_month', 'desc')
                    ->first();

                $latestRevenueEntry = $activeBusiness->revenueEntries()
                    ->orderBy('period_month', 'desc')
                    ->first();

                // Calculate metrics
                if ($latestElectricityEntry) {
                    $usageKwh = $latestElectricityEntry->usage_kwh;
                    $tariffPerKwh = $latestElectricityEntry->tariff_per_kwh;

                    if ($latestElectricityEntry->bill_amount_idr !== null) {
                        $electricityCostIdr = $latestElectricityEntry->bill_amount_idr;
                    } elseif ($usageKwh !== null && $tariffPerKwh !== null) {
                        $electricityCostIdr = $this->calculator->estimateBillAmount($usageKwh, $tariffPerKwh);
                    }
                }

                if ($latestRevenueEntry) {
                    $revenueAmountIdr = $latestRevenueEntry->revenue_amount_idr;
                }

                if ($electricityCostIdr !== null && $revenueAmountIdr !== null) {
                    $electricityRevenueRatioPercent = $this->calculator->calculateElectricityRevenueRatio(
                        $electricityCostIdr,
                        $revenueAmountIdr
                    );
                    $remainingRevenueAfterElectricity = $this->calculator->calculateRemainingRevenueAfterElectricity(
                        $revenueAmountIdr,
                        $electricityCostIdr
                    );
                }

                // Get top 3 appliances by energy consumption
                $tariffForEstimate = null;
                $profile = $activeBusiness->electricityProfile;
                if ($profile && $profile->tariff_per_kwh !== null) {
                    $tariffForEstimate = (float) $profile->tariff_per_kwh;
                } elseif ($latestElectricityEntry && $latestElectricityEntry->tariff_per_kwh !== null) {
                    $tariffForEstimate = (float) $latestElectricityEntry->tariff_per_kwh;
                }

                $topAppliances = $activeBusiness->appliances()
                    ->get()
                    ->map(function ($appliance) use ($tariffForEstimate) {
                        $watt = $appliance->watt !== null ? (float) $appliance->watt : null;
                        $quantity = $appliance->quantity;
                        $hoursPerDay = $appliance->hours_per_day !== null ? (float) $appliance->hours_per_day : null;
                        $daysPerMonth = $appliance->days_per_month;

                        $kwh = $this->applianceEstimator->estimateMonthlyKwh($watt, $quantity, $hoursPerDay, $daysPerMonth);
                        $appliance->estimated_monthly_kwh = $kwh;
                        $appliance->estimated_monthly_cost = $this->applianceEstimator->estimateMonthlyCost($kwh, $tariffForEstimate);
                        $appliance->ranking_reason = $this->applianceEstimator->getRankingReason($watt, $quantity, $hoursPerDay);
                        return $appliance;
                    })
                    ->filter(fn($a) => $a->estimated_monthly_kwh > 0)
                    ->sortBy([
                        ['estimated_monthly_kwh', 'desc'],
                        ['name', 'asc'],
                        ['id', 'asc'],
                    ])
                    ->take(3)
                    ->values()
                    ->toArray();
            }
        }

        $efficiencyScore = null;
        $topRecommendations = [];

        if ($activeBusiness) {
            $efficiencyScore = $this->efficiencyScoreService->calculateForBusiness($activeBusiness);
            $topRecommendations = $this->recommendationService->getTopRecommendationsForBusiness($activeBusiness, 3);
        }

        // Determine data completeness status
        $dataCompleteness = 'COMPLETE';
        if (!$latestElectricityEntry && !$latestRevenueEntry) {
            $dataCompleteness = 'EMPTY';
        } elseif (!$latestElectricityEntry) {
            $dataCompleteness = 'NO_ELECTRICITY';
        } elseif (!$latestRevenueEntry) {
            $dataCompleteness = 'NO_REVENUE';
        }

        // Build charts data
        $chartsData = [
            'has_data' => false,
            'is_kos_property' => false,
            'room_count' => null,
            'months' => [],
            'next_month_prediction' => null,
        ];

        if ($activeBusiness) {
            $isKos = $activeBusiness->business_type === 'KOS_PROPERTY';
            $profile = $activeBusiness->businessProfile;
            $roomCount = $profile ? $profile->room_count : null;

            $chartsData['is_kos_property'] = $isKos;
            $chartsData['room_count'] = $roomCount;

            // Load all electricity and revenue entries
            $electricityEntries = $activeBusiness->electricityEntries()->orderBy('period_month', 'asc')->get();
            $revenueEntries = $activeBusiness->revenueEntries()->orderBy('period_month', 'asc')->get();

            // Map and group by Y-m-d
            $groupedElectricity = [];
            foreach ($electricityEntries as $entry) {
                if ($entry->period_month) {
                    $m = \Carbon\Carbon::parse($entry->period_month)->format('Y-m-d');
                    $groupedElectricity[$m] = $entry;
                }
            }

            $groupedRevenue = [];
            foreach ($revenueEntries as $entry) {
                if ($entry->period_month) {
                    $m = \Carbon\Carbon::parse($entry->period_month)->format('Y-m-d');
                    $groupedRevenue[$m] = $entry;
                }
            }

            // Get unique months sorted chronologically asc
            $uniqueMonths = collect(array_keys($groupedElectricity))
                ->merge(array_keys($groupedRevenue))
                ->unique()
                ->sort()
                ->take(-6) // take last 6 chronological months
                ->values();

            if ($uniqueMonths->isNotEmpty()) {
                $chartsData['has_data'] = true;

                foreach ($uniqueMonths as $monthStr) {
                    $carbonMonth = \Carbon\Carbon::parse($monthStr);
                    $eEntry = $groupedElectricity[$monthStr] ?? null;
                    $rEntry = $groupedRevenue[$monthStr] ?? null;

                    $usage = $eEntry ? ($eEntry->usage_kwh !== null ? (float) $eEntry->usage_kwh : null) : null;
                    $bill = $eEntry ? ($eEntry->bill_amount_idr !== null ? (float) $eEntry->bill_amount_idr : null) : null;
                    $tariff = $eEntry ? ($eEntry->tariff_per_kwh !== null ? (float) $eEntry->tariff_per_kwh : null) : null;

                    if ($bill === null && $usage !== null && $tariff !== null) {
                        $bill = (float) $this->calculator->estimateBillAmount($usage, $tariff);
                    }
                    if ($usage === null && $bill !== null && $tariff !== null && $tariff > 0.0) {
                        $usage = $bill / $tariff;
                    }

                    $revenue = $rEntry ? ($rEntry->revenue_amount_idr !== null ? (float) $rEntry->revenue_amount_idr : null) : null;

                    $occupiedRooms = null;
                    if ($isKos && $rEntry && $rEntry->notes) {
                        if (preg_match('/(\d+)\s*kamar/i', $rEntry->notes, $matches)) {
                            $occupiedRooms = (int) $matches[1];
                        }
                    }
                    if ($isKos && $occupiedRooms === null) {
                        $occupiedRooms = $profile ? $profile->occupied_room_count : null;
                    }

                    $occupancyRatePercent = null;
                    if ($isKos && $roomCount > 0 && $occupiedRooms !== null) {
                        $occupancyRatePercent = min(100.0, ($occupiedRooms / $roomCount) * 100.0);
                    }

                    $ratioPercent = null;
                    if ($bill !== null && $revenue !== null) {
                        if ($revenue > 0.0) {
                            $ratioPercent = min(100.0, ($bill / $revenue) * 100.0);
                        } else {
                            $ratioPercent = 0.0;
                        }
                    }

                    // Preceding baseline calculation
                    $precedingUsages = [];
                    foreach ($groupedElectricity as $peStr => $pe) {
                        if ($peStr < $monthStr) {
                            $peUsage = $pe->usage_kwh !== null ? (float) $pe->usage_kwh : null;
                            $peBill = $pe->bill_amount_idr !== null ? (float) $pe->bill_amount_idr : null;
                            $peTariff = $pe->tariff_per_kwh !== null ? (float) $pe->tariff_per_kwh : null;
                            if ($peUsage === null && $peBill !== null && $peTariff !== null && $peTariff > 0.0) {
                                $peUsage = $peBill / $peTariff;
                            }
                            if ($peUsage !== null) {
                                $precedingUsages[] = $peUsage;
                            }
                        }
                    }

                    $estUsage = null;
                    $estBill = null;
                    if (count($precedingUsages) > 0) {
                        $estUsage = array_sum($precedingUsages) / count($precedingUsages);
                        $estTariff = $tariff;
                        if ($estTariff === null) {
                            $sortedPreceding = collect($groupedElectricity)
                                ->filter(fn($pe, $peStr) => $peStr < $monthStr)
                                ->sortKeysDesc();
                            foreach ($sortedPreceding as $pe) {
                                if ($pe->tariff_per_kwh !== null) {
                                    $estTariff = (float) $pe->tariff_per_kwh;
                                    break;
                                }
                            }
                        }
                        if ($estTariff !== null) {
                            $estBill = $estUsage * $estTariff;
                        }
                    }

                    $chartsData['months'][] = [
                        'period_month' => $carbonMonth->format('Y-m'),
                        'month_name' => $carbonMonth->translatedFormat('M Y'),
                        'usage_kwh' => $usage !== null ? round($usage, 2) : null,
                        'bill_amount_idr' => $bill !== null ? round($bill, 2) : null,
                        'revenue_amount_idr' => $revenue !== null ? round($revenue, 2) : null,
                        'ratio_percent' => $ratioPercent !== null ? round($ratioPercent, 2) : null,
                        'estimated_usage_kwh' => $estUsage !== null ? round($estUsage, 2) : null,
                        'estimated_bill_amount_idr' => $estBill !== null ? round($estBill, 2) : null,
                        'occupied_rooms' => $occupiedRooms,
                        'occupancy_rate_percent' => $occupancyRatePercent !== null ? round($occupancyRatePercent, 2) : null,
                    ];
                }
            }

            if ($electricityEntries->isNotEmpty()) {
                $isDetailedUnlocked = $this->featureGateService->can($user, 'prediction.detailed', $activeBusiness);
                $prediction = $this->predictionService->predictForBusiness($activeBusiness, $isDetailedUnlocked);
                if ($prediction && isset($prediction['has_prediction']) && $prediction['has_prediction']) {
                    $nextMonth = \Carbon\Carbon::parse($electricityEntries->last()->period_month)->addMonth();
                    $chartsData['next_month_prediction'] = [
                        'period_month' => $nextMonth->format('Y-m'),
                        'month_name' => $nextMonth->translatedFormat('M Y'),
                        'usage_kwh' => $prediction['predicted_usage_kwh'],
                        'bill_amount_idr' => $prediction['estimated_bill_idr'],
                    ];
                }
            }
        }

        return Inertia::render('Dashboard', [
            'userName' => $user ? $user->name : '',
            'hasBusiness' => $hasBusiness,
            'businessCount' => $businessCount,
            'businessName' => $activeBusiness ? $activeBusiness->name : null,
            'businessType' => $activeBusiness ? $activeBusiness->business_type : null,
            'businesses' => $businesses,
            'activeBusinessId' => $activeBusiness ? $activeBusiness->id : null,
            
            // Week 2 summary props
            'latestElectricityEntry' => $latestElectricityEntry,
            'latestRevenueEntry' => $latestRevenueEntry,
            'electricityCostIdr' => $electricityCostIdr,
            'usageKwh' => $usageKwh,
            'tariffPerKwh' => $tariffPerKwh,
            'revenueAmountIdr' => $revenueAmountIdr,
            'electricityRevenueRatioPercent' => $electricityRevenueRatioPercent,
            'remainingRevenueAfterElectricity' => $remainingRevenueAfterElectricity,
            'dataCompleteness' => $dataCompleteness,
            'topAppliances' => $topAppliances ?? [],

            // Week 4 recommendation props
            'efficiencyScore' => $efficiencyScore,
            'topRecommendations' => $topRecommendations,

            // Week 6/7 chart props
            'chartsData' => $chartsData,
        ]);
    }
}
