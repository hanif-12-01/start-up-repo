<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreRevenueEntryRequest;
use App\Models\RevenueEntry;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RevenueEntryController extends Controller
{
    protected \App\Services\FeatureGateService $featureGateService;

    public function __construct(\App\Services\FeatureGateService $featureGateService)
    {
        $this->featureGateService = $featureGateService;
    }

    /**
     * Display a listing of revenue entries.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $resolver = app(\App\Services\ActiveBusinessResolver::class);
        $activeBusiness = $resolver->resolve($request);
        $businesses = $resolver->activeBusinesses($request);
        $entries = [];

        if ($activeBusiness) {
            $entries = $activeBusiness->revenueEntries()
                ->orderBy('period_month', 'desc')
                ->get();
        }

        $effectivePlan = $activeBusiness ? $this->featureGateService->getEffectivePlan($user, $activeBusiness) : null;
        $revenueLimit = $activeBusiness ? $this->featureGateService->limit($user, 'revenue.entries', $activeBusiness) : null;

        return Inertia::render('Revenue/Index', [
            'businesses' => $businesses,
            'activeBusinessId' => $activeBusiness ? $activeBusiness->id : null,
            'entries' => $entries,
            'effectivePlan' => $effectivePlan,
            'revenueLimit' => $revenueLimit,
        ]);
    }

    /**
     * Store a newly created resource in storage or update existing if it matches business_id + period_month.
     */
    public function store(StoreRevenueEntryRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        // Normalize period_month to the first day of the month as a Carbon instance for Eloquent query safety
        $periodMonth = \Carbon\Carbon::parse($validated['period_month'])->startOfMonth();

        $businessId = $validated['business_id'];

        // Enforce plan limit for new entries
        $exists = RevenueEntry::where('business_id', $businessId)
            ->where('period_month', $periodMonth)
            ->exists();

        if (!$exists) {
            $user = $request->user();
            $business = \App\Models\Business::find($businessId);
            $limit = $this->featureGateService->limit($user, 'revenue.entries', $business);
            if ($limit !== null) {
                $usage = $this->featureGateService->usage($user, 'revenue.entries', $business);
                if ($usage >= $limit) {
                    \Inertia\Inertia::flash('toast', [
                        'type' => 'error',
                        'message' => $this->featureGateService->getUpgradeMessage('revenue.entries')
                    ]);
                    return redirect()->back()->with('error', $this->featureGateService->getUpgradeMessage('revenue.entries'));
                }
            }
        }

        // Upsert by business_id + period_month
        RevenueEntry::updateOrCreate(
            [
                'business_id' => $businessId,
                'period_month' => $periodMonth,
            ],
            [
                'revenue_amount_idr' => $validated['revenue_amount_idr'] ?? null,
                'revenue_input_mode' => $validated['revenue_input_mode'],
                'notes' => $validated['notes'] ?? null,
            ]
        );

        return redirect()->back()->with('success', 'Data pendapatan berhasil disimpan.');
    }
}
