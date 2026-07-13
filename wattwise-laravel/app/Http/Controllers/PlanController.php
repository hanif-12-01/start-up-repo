<?php

namespace App\Http\Controllers;

use App\Models\BillingPlan;
use App\Services\Billing\BillingAvailability;
use App\Services\FeatureGateService;
use App\Services\TrialActivationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PlanController extends Controller
{
    public function __construct(
        private readonly FeatureGateService $featureGateService,
        private readonly TrialActivationService $trialActivationService,
    ) {}

    /**
     * Display the plans page.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $business = $user->businesses()->first();

        $effectivePlan = $this->featureGateService->getEffectivePlan($user, $business);
        $billingPlans = app(BillingAvailability::class)->enabled()
            ? BillingPlan::query()
                ->whereIn('code', [BillingPlan::CODE_FREE, BillingPlan::CODE_PRO, BillingPlan::CODE_BUSINESS])
                ->where('active', true)
                ->orderBy('price_amount')
                ->get()
                ->map(fn (BillingPlan $plan): array => [
                    'code' => $plan->code,
                    'name' => $plan->name,
                    'price_amount' => $plan->price_amount,
                    'currency' => $plan->currency,
                    'interval' => $plan->interval,
                ])
                ->values()
                ->all()
            : [];

        // Get usage metrics to pass to UI
        $usage = [
            'electricity_entries' => [
                'current' => $this->featureGateService->usage($user, 'electricity.entries', $business),
                'limit' => $this->featureGateService->limit($user, 'electricity.entries', $business),
            ],
            'revenue_entries' => [
                'current' => $this->featureGateService->usage($user, 'revenue.entries', $business),
                'limit' => $this->featureGateService->limit($user, 'revenue.entries', $business),
            ],
            'appliances' => [
                'current' => $this->featureGateService->usage($user, 'appliances.manage', $business),
                'limit' => $this->featureGateService->limit($user, 'appliances.manage', $business),
            ],
            'businesses' => [
                'current' => $this->featureGateService->usage($user, 'businesses.multiple', $business),
                'limit' => $this->featureGateService->limit($user, 'businesses.multiple', $business),
            ],
        ];

        return Inertia::render('Plans/Index', [
            'effectivePlan' => $effectivePlan,
            'usage' => $usage,
            'billingPlans' => $billingPlans,
        ]);
    }

    /**
     * Start the 30-day Pro Trial.
     */
    public function startTrial(Request $request): RedirectResponse
    {
        $result = $this->trialActivationService->activate($request->user());

        $type = $result['success'] ? 'success' : 'error';
        Inertia::flash('toast', ['type' => $type, 'message' => $result['message']]);

        return redirect()->back()->with($type, $result['message']);
    }
}
