<?php

namespace App\Http\Controllers;

use App\Services\Electricity\ElectricityCalculator;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    protected ElectricityCalculator $calculator;

    public function __construct(ElectricityCalculator $calculator)
    {
        $this->calculator = $calculator;
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
            }
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
        ]);
    }
}
