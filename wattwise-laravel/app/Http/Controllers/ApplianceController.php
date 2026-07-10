<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreApplianceRequest;
use App\Http\Requests\UpdateApplianceRequest;
use App\Models\Appliance;
use App\Services\Appliances\ApplianceEstimator;
use App\Services\Appliances\ApplianceTemplateService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ApplianceController extends Controller
{
    public function __construct(
        private readonly ApplianceEstimator $estimator,
        private readonly ApplianceTemplateService $templateService,
        private readonly \App\Services\FeatureGateService $featureGateService,
    ) {}

    /**
     * Display the appliances page for the active business.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $resolver = app(\App\Services\ActiveBusinessResolver::class);
        $activeBusiness = $resolver->resolve($request);
        $businesses = $resolver->activeBusinesses($request);
        $appliances = [];
        $tariffPerKwh = null;
        $templateSegmentLabel = null;
        $templatePreview = [];

        if ($activeBusiness) {
            // Resolve tariff: electricity_profile first, then latest entry
            $tariffPerKwh = $this->resolveTariff($activeBusiness);

            $appliances = $activeBusiness->appliances()
                ->orderBy('name')
                ->get()
                ->map(function (Appliance $appliance) use ($tariffPerKwh) {
                    $watt = $appliance->watt !== null ? (float) $appliance->watt : null;
                    $quantity = $appliance->quantity;
                    $hoursPerDay = $appliance->hours_per_day !== null ? (float) $appliance->hours_per_day : null;
                    $daysPerMonth = $appliance->days_per_month;

                    $kwh = $this->estimator->estimateMonthlyKwh($watt, $quantity, $hoursPerDay, $daysPerMonth);
                    $appliance->estimated_monthly_kwh = $kwh;

                    $appliance->estimated_monthly_cost = $this->estimator->estimateMonthlyCost($kwh, $tariffPerKwh);
                    $appliance->ranking_reason = $this->estimator->getRankingReason($watt, $quantity, $hoursPerDay);
                    $appliance->potential_saving = $this->estimator->estimatePotentialSaving($watt, $quantity, $daysPerMonth, $tariffPerKwh);

                    return $appliance;
                });

            // Get template preview
            $templateSegmentLabel = $this->templateService->getSegmentLabel($activeBusiness->business_type ?? 'OTHER');
            $templatePreview = $this->templateService->getTemplateForBusinessType($activeBusiness->business_type ?? 'OTHER');
        }

        $effectivePlan = $activeBusiness ? $this->featureGateService->getEffectivePlan($user, $activeBusiness) : null;
        $applianceLimit = $activeBusiness ? $this->featureGateService->limit($user, 'appliances.manage', $activeBusiness) : null;

        return Inertia::render('Appliances/Index', [
            'businesses' => $businesses,
            'activeBusinessId' => $activeBusiness?->id,
            'businessType' => $activeBusiness?->business_type,
            'appliances' => $appliances,
            'tariffPerKwh' => $tariffPerKwh,
            'templateSegmentLabel' => $templateSegmentLabel,
            'templatePreview' => $templatePreview,
            'effectivePlan' => $effectivePlan,
            'applianceLimit' => $applianceLimit,
        ]);
    }

    /**
     * Store a newly created appliance.
     */
    public function store(StoreApplianceRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $user = $request->user();
        $businessId = $validated['business_id'];
        $business = \App\Models\Business::find($businessId);

        // Check plan limits
        $limit = $this->featureGateService->limit($user, 'appliances.manage', $business);
        if ($limit !== null) {
            $usage = $this->featureGateService->usage($user, 'appliances.manage', $business);
            if ($usage >= $limit) {
                \Inertia\Inertia::flash('toast', [
                    'type' => 'error',
                    'message' => $this->featureGateService->getUpgradeMessage('appliances.manage')
                ]);
                return redirect()->back()->with('error', $this->featureGateService->getUpgradeMessage('appliances.manage'));
            }
        }

        Appliance::create([
            'business_id' => $businessId,
            'name' => $validated['name'],
            'category' => $validated['category'] ?? null,
            'watt' => $validated['watt'] ?? null,
            'quantity' => $validated['quantity'],
            'hours_per_day' => $validated['hours_per_day'] ?? null,
            'days_per_month' => $validated['days_per_month'] ?? null,
            'source' => 'MANUAL',
            'confidence' => 'USER_CUSTOM',
            'notes' => $validated['notes'] ?? null,
        ]);

        return redirect()->back()->with('success', 'Peralatan berhasil ditambahkan.');
    }

    /**
     * Update the specified appliance.
     */
    public function update(UpdateApplianceRequest $request, Appliance $appliance): RedirectResponse
    {
        $validated = $request->validated();

        $appliance->update([
            'name' => $validated['name'],
            'category' => $validated['category'] ?? null,
            'watt' => $validated['watt'] ?? null,
            'quantity' => $validated['quantity'],
            'hours_per_day' => $validated['hours_per_day'] ?? null,
            'days_per_month' => $validated['days_per_month'] ?? null,
            'notes' => $validated['notes'] ?? null,
        ]);

        return redirect()->back()->with('success', 'Peralatan berhasil diperbarui.');
    }

    /**
     * Apply appliance template for the active/selected business.
     */
    public function applyTemplate(Request $request): RedirectResponse
    {
        $user = $request->user();

        $request->validate([
            'business_id' => [
                'required',
                \Illuminate\Validation\Rule::exists('businesses', 'id')->where(function ($query) use ($user) {
                    $query->where('user_id', $user->id)
                        ->where('status', \App\Models\Business::STATUS_ACTIVE);
                }),
            ],
        ]);

        $activeBusinessId = $request->input('business_id');
        $resolver = app(\App\Services\ActiveBusinessResolver::class);
        $businesses = $resolver->activeBusinesses($request);

        if ($businesses->isEmpty()) {
            return redirect()->back()->withErrors(['business' => 'Belum ada usaha terdaftar.']);
        }

        $activeBusiness = $businesses->firstWhere('id', $activeBusinessId);
        if (!$activeBusiness) {
            $activeBusiness = $businesses->first();
        }

        // Check if template feature is allowed
        if (!$this->featureGateService->can($user, 'appliances.templates', $activeBusiness)) {
            \Inertia\Inertia::flash('toast', [
                'type' => 'error',
                'message' => $this->featureGateService->getUpgradeMessage('appliances.templates')
            ]);
            return redirect()->back()->with('error', $this->featureGateService->getUpgradeMessage('appliances.templates'));
        }

        $result = $this->templateService->applyTemplateToBusiness($activeBusiness);

        if ($result['created_count'] > 0) {
            return redirect()->back()->with('success', 'Template berhasil ditambahkan. Silakan hapus alat yang tidak ada atau ubah daya/jam pakainya sesuai kondisi sebenarnya.');
        }

        return redirect()->back()->with('success', 'Beberapa alat sudah ada, jadi tidak ditambahkan ulang.');
    }

    /**
     * Delete the specified appliance.
     */
    public function destroy(Request $request, Appliance $appliance): RedirectResponse
    {
        // Authorization: ensure appliance belongs to current user's business
        if ($appliance->business->user_id !== $request->user()->id) {
            abort(403);
        }

        if ($appliance->business->status !== \App\Models\Business::STATUS_ACTIVE) {
            abort(403, 'Usaha yang diarsipkan tidak dapat diubah.');
        }

        $appliance->delete();

        return redirect()->back()->with('success', 'Peralatan berhasil dihapus.');
    }

    /**
     * Resolve tariff per kWh from electricity profile or latest entry.
     */
    private function resolveTariff($business): ?float
    {
        // Priority 1: electricity_profile.tariff_per_kwh
        $profile = $business->electricityProfile;
        if ($profile && $profile->tariff_per_kwh !== null) {
            return (float) $profile->tariff_per_kwh;
        }

        // Priority 2: latest electricity entry tariff_per_kwh
        $latestEntry = $business->electricityEntries()
            ->whereNotNull('tariff_per_kwh')
            ->orderBy('period_month', 'desc')
            ->first();

        if ($latestEntry && $latestEntry->tariff_per_kwh !== null) {
            return (float) $latestEntry->tariff_per_kwh;
        }

        return null;
    }
}
