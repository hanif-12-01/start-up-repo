<?php

namespace App\Http\Controllers;

use App\Http\Requests\GeneratePredictionRequest;
use App\Services\FeatureGateService;
use App\Services\Predictions\PredictionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PredictionController extends Controller
{
    public function __construct(
        private readonly PredictionService $predictionService,
        private readonly FeatureGateService $featureGateService,
    ) {}

    /**
     * Display the predictions page for the active (owned) business.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $resolver = app(\App\Services\ActiveBusinessResolver::class);
        $activeBusiness = $resolver->resolve($request);
        $businesses = $resolver->activeBusinesses($request);

        $prediction = null;
        if ($activeBusiness) {
            // Detailed analysis is plan-gated; the summary is always available.
            $isDetailedUnlocked = $this->featureGateService->can($user, 'prediction.detailed', $activeBusiness);
            $prediction = $this->predictionService->predictForBusiness($activeBusiness, $isDetailedUnlocked);
        }

        return Inertia::render('Predictions/Index', [
            'businesses' => $businesses,
            'activeBusinessId' => $activeBusiness?->id,
            'hasBusiness' => $businesses->isNotEmpty(),
            'prediction' => $prediction,
            'generated' => $request->boolean('generated'),
        ]);
    }

    /**
     * Generate (reveal/refresh) a prediction. Predictions are not persisted —
     * this deterministically recomputes on the redirected index request.
     */
    public function generate(GeneratePredictionRequest $request): RedirectResponse
    {
        $businessId = (int) $request->validated()['business_id'];

        return redirect()->route('predictions.index', [
            'business_id' => $businessId,
            'generated' => 1,
        ]);
    }
}
