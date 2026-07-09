<?php

namespace App\Http\Controllers;

use App\Services\Electricity\ElectricityCalculator;
use App\Services\Appliances\ApplianceEstimator;
use App\Services\Recommendations\RecommendationService;
use App\Services\Recommendations\EfficiencyScoreService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    protected ElectricityCalculator $calculator;
    protected ApplianceEstimator $applianceEstimator;
    protected RecommendationService $recommendationService;
    protected EfficiencyScoreService $efficiencyScoreService;

    public function __construct(
        ElectricityCalculator $calculator,
        ApplianceEstimator $applianceEstimator,
        RecommendationService $recommendationService,
        EfficiencyScoreService $efficiencyScoreService
    ) {
        $this->calculator = $calculator;
        $this->applianceEstimator = $applianceEstimator;
        $this->recommendationService = $recommendationService;
        $this->efficiencyScoreService = $efficiencyScoreService;
    }

    /**
     * Display the dashboard.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $businesses = $user ? $user->businesses()->get() : collect();
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
        ]);
    }
}
