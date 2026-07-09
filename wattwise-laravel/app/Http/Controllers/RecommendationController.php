<?php

namespace App\Http\Controllers;

use App\Services\Recommendations\RecommendationService;
use App\Services\Recommendations\EfficiencyScoreService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RecommendationController extends Controller
{
    public function __construct(
        private readonly RecommendationService $recommendationService,
        private readonly EfficiencyScoreService $efficiencyScoreService
    ) {}

    /**
     * Display the recommendations page.
     *
     * @param Request $request
     * @return Response
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $businesses = $user ? $user->businesses()->get() : collect();
        $activeBusiness = null;
        $businessCount = $businesses->count();
        $hasBusiness = $businessCount > 0;

        $recommendations = [];
        $efficiencyScore = null;
        $latestElectricityEntry = null;
        $latestRevenueEntry = null;
        $applianceCount = 0;

        if ($hasBusiness) {
            $activeBusinessId = $request->query('business_id');
            if ($activeBusinessId) {
                $activeBusiness = $businesses->firstWhere('id', $activeBusinessId);
            }
            if (!$activeBusiness) {
                $activeBusiness = $businesses->first();
            }

            if ($activeBusiness) {
                $recommendations = $this->recommendationService->getRecommendationsForBusiness($activeBusiness);
                $efficiencyScore = $this->efficiencyScoreService->calculateForBusiness($activeBusiness);
                
                $latestElectricityEntry = $activeBusiness->electricityEntries()
                    ->orderBy('period_month', 'desc')
                    ->first();

                $latestRevenueEntry = $activeBusiness->revenueEntries()
                    ->orderBy('period_month', 'desc')
                    ->first();

                $applianceCount = $activeBusiness->appliances()->count();
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

        return Inertia::render('Recommendations/Index', [
            'hasBusiness' => $hasBusiness,
            'businesses' => $businesses,
            'activeBusinessId' => $activeBusiness ? $activeBusiness->id : null,
            'activeBusiness' => $activeBusiness,
            'recommendations' => $recommendations,
            'efficiencyScore' => $efficiencyScore,
            'latestElectricityEntry' => $latestElectricityEntry,
            'latestRevenueEntry' => $latestRevenueEntry,
            'applianceCount' => $applianceCount,
            'dataCompleteness' => $dataCompleteness,
        ]);
    }
}
