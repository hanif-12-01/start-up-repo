<?php

namespace App\Http\Controllers;

use App\Services\FeatureGateService;
use App\Models\Subscription;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class PlanController extends Controller
{
    public function __construct(
        private readonly FeatureGateService $featureGateService
    ) {}

    /**
     * Display the plans page.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $business = $user->businesses()->first();

        $effectivePlan = $this->featureGateService->getEffectivePlan($user, $business);

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
        ]);
    }

    /**
     * Start the 30-day Pro Trial.
     */
    public function startTrial(Request $request): RedirectResponse
    {
        $user = $request->user();

        // Check if user already had a trial or has active subscription
        $subscription = $user->subscription;

        if ($subscription) {
            if ($subscription->trial_ends_at !== null) {
                Inertia::flash('toast', ['type' => 'error', 'message' => 'Anda sudah pernah menggunakan masa uji coba (trial) sebelumnya.']);
                return redirect()->back()->with('error', 'Anda sudah pernah menggunakan masa uji coba (trial) sebelumnya.');
            }

            if (!in_array(strtoupper($subscription->plan), ['FREE', 'PRO_TRIAL']) && strtoupper($subscription->status) === 'ACTIVE') {
                Inertia::flash('toast', ['type' => 'error', 'message' => 'Anda sudah memiliki langganan berbayar yang aktif.']);
                return redirect()->back()->with('error', 'Anda sudah memiliki langganan berbayar yang aktif.');
            }
        }

        // Initialize or update subscription with 30-day Pro Trial
        Subscription::updateOrCreate(
            ['user_id' => $user->id],
            [
                'plan' => 'PRO_TRIAL',
                'status' => 'ACTIVE',
                'trial_starts_at' => Carbon::now(),
                'trial_ends_at' => Carbon::now()->addDays(30),
            ]
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Mulai Pro Trial 30 Hari berhasil diaktifkan! Anda kini memiliki akses penuh fitur Pro.']);
        return redirect()->back()->with('success', 'Mulai Pro Trial 30 Hari berhasil diaktifkan! Anda kini memiliki akses penuh fitur Pro.');
    }
}
