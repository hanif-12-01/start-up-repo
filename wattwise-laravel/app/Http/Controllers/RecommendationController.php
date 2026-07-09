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
        private readonly EfficiencyScoreService $efficiencyScoreService,
        private readonly \App\Services\FeatureGateService $featureGateService
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

        $effectivePlan = null;

        if ($hasBusiness) {
            $activeBusinessId = $request->query('business_id');
            if ($activeBusinessId) {
                $activeBusiness = $businesses->firstWhere('id', $activeBusinessId);
            }
            if (!$activeBusiness) {
                $activeBusiness = $businesses->first();
            }

            if ($activeBusiness) {
                $effectivePlan = $this->featureGateService->getEffectivePlan($user, $activeBusiness);
                $rawRecommendations = $this->recommendationService->getRecommendationsForBusiness($activeBusiness);
                
                // Map and apply gating to recommendations
                $recommendations = collect($rawRecommendations)->map(function ($rec, $index) use ($effectivePlan) {
                    if ($effectivePlan && $effectivePlan['id'] === 'FREE' && $index >= 3) {
                        return [
                            'priority' => $rec['priority'] ?? 'LOW',
                            'title' => 'Rekomendasi Hemat Tambahan',
                            'estimated_saving_idr' => null,
                            'description' => 'Upgrade ke paket Pro untuk melihat analisis mendalam dan langkah penghematan terperinci.',
                            'reason' => 'Tersedia setelah peningkatan akun.',
                            'action' => 'Mulai Pro Trial 30 Hari',
                            'badges' => ['Premium'],
                            'is_locked' => true,
                        ];
                    }
                    $rec['is_locked'] = false;
                    return $rec;
                })->toArray();

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
            'effectivePlan' => $effectivePlan,
        ]);
    }
}
