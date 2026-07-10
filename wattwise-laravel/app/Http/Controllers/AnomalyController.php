<?php

namespace App\Http\Controllers;

use App\Services\Anomalies\AnomalyService;
use App\Services\FeatureGateService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Carbon\Carbon;

class AnomalyController extends Controller
{
    public function __construct(
        private readonly AnomalyService $anomalyService,
        private readonly FeatureGateService $featureGateService
    ) {}

    /**
     * Display the anomalies page for the active (owned) business.
     *
     * @param Request $request
     * @return Response
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $resolver = app(\App\Services\ActiveBusinessResolver::class);
        $activeBusiness = $resolver->resolve($request);
        $businesses = $resolver->activeBusinesses($request);

        $analysis = null;
        $availableMonths = [];
        $selectedMonth = $request->query('month');

        if ($activeBusiness) {
            // Get available months based on electricity entries
            $availableMonths = $activeBusiness->electricityEntries()
                ->orderBy('period_month', 'desc')
                ->pluck('period_month')
                ->map(function ($date) {
                    return Carbon::parse($date)->format('Y-m');
                })
                ->unique()
                ->values()
                ->toArray();

            // Normalize selected month: fallback to latest month with data, or current month if none
            if (!$selectedMonth || !preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $selectedMonth)) {
                $selectedMonth = !empty($availableMonths) ? $availableMonths[0] : Carbon::now()->format('Y-m');
            }

            // Perform deterministic anomaly analysis
            $analysis = $this->anomalyService->analyze($activeBusiness, $selectedMonth);
        } else {
            // Fallback selected month for business-less state
            if (!$selectedMonth || !preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $selectedMonth)) {
                $selectedMonth = Carbon::now()->format('Y-m');
            }
        }

        return Inertia::render('Anomalies/Index', [
            'businesses' => $businesses,
            'activeBusinessId' => $activeBusiness?->id,
            'hasBusiness' => $businesses->isNotEmpty(),
            'selectedMonth' => $selectedMonth,
            'availableMonths' => $availableMonths,
            'analysis' => $analysis,
        ]);
    }
}
