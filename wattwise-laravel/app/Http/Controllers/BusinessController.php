<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreBusinessRequest;
use App\Http\Requests\UpdateBusinessRequest;
use App\Models\Business;
use App\Services\FeatureGateService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class BusinessController extends Controller
{
    public function __construct(
        private readonly FeatureGateService $featureGateService,
    ) {}

    /**
     * List the authenticated user's businesses, split by lifecycle status.
     */
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Business::class);

        $user = $request->user();

        $businesses = $user->businesses()
            ->with(['businessProfile', 'electricityProfile'])
            ->orderBy('name')
            ->orderBy('id')
            ->get();

        $activeBusinesses = $businesses
            ->where('status', Business::STATUS_ACTIVE)
            ->values();
        $archivedBusinesses = $businesses
            ->where('status', Business::STATUS_ARCHIVED)
            ->values();

        $activeBusinessCount = $activeBusinesses->count();
        $businessLimit = $this->featureGateService->limit($user, 'businesses.multiple');
        $canCreateBusiness = $businessLimit === null || $activeBusinessCount < $businessLimit;

        // effectivePlan is provided globally by the HandleInertiaRequests
        // shared props — not duplicated here.
        return Inertia::render('Businesses', [
            'activeBusinesses' => $activeBusinesses,
            'archivedBusinesses' => $archivedBusinesses,
            'activeBusinessCount' => $activeBusinessCount,
            'businessLimit' => $businessLimit,
            'canCreateBusiness' => $canCreateBusiness,
        ]);
    }

    /**
     * Create a new ACTIVE business with both profiles, enforcing the
     * plan's active-business limit server-side.
     */
    public function store(StoreBusinessRequest $request): RedirectResponse
    {
        Gate::authorize('create', Business::class);

        $user = $request->user();
        $validated = $request->validated();

        // Only ACTIVE businesses count toward the plan limit. Archived
        // businesses are preserved and never counted (locked decision).
        $limit = $this->featureGateService->limit($user, 'businesses.multiple');
        $activeCount = $user->businesses()
            ->where('status', Business::STATUS_ACTIVE)
            ->count();

        if ($limit !== null && $activeCount >= $limit) {
            throw ValidationException::withMessages([
                'business_limit' => $this->featureGateService->getUpgradeMessage('businesses.multiple'),
            ]);
        }

        DB::transaction(function () use ($validated, $user) {
            $business = new Business();
            $business->user_id = $user->id; // ownership assigned explicitly, never from input
            $business->name = $validated['name'];
            $business->business_type = $validated['business_type'];
            $business->city = $validated['city'] ?? null;
            $business->province = $validated['province'] ?? null;
            $business->address = $validated['address'] ?? null;
            $business->status = Business::STATUS_ACTIVE;
            $business->onboarding_completed_at = now();
            $business->save();

            $business->businessProfile()->create([
                'room_count' => $validated['room_count'] ?? null,
                'occupied_room_count' => $validated['occupied_room_count'] ?? null,
                'employee_count' => $validated['employee_count'] ?? null,
                'operating_days_per_month' => $validated['operating_days_per_month'] ?? null,
                'notes' => $validated['business_notes'] ?? null,
            ]);

            $business->electricityProfile()->create([
                'customer_type' => $validated['customer_type'] ?? null,
                'power_va' => $validated['power_va'] ?? null,
                'tariff_per_kwh' => $validated['tariff_per_kwh'] ?? null,
                'payment_method' => $validated['payment_method'] ?? null,
                'meter_type' => $validated['meter_type'] ?? null,
                'notes' => $validated['electricity_notes'] ?? null,
            ]);
        });

        return redirect()
            ->route('businesses.index')
            ->with('success', 'Usaha/properti baru berhasil ditambahkan.');
    }

    /**
     * Update a business and its profiles. Ownership and status are never
     * changed here (archive/restore is Step 11).
     */
    public function update(UpdateBusinessRequest $request, Business $business): RedirectResponse
    {
        Gate::authorize('update', $business);

        if ($business->status === Business::STATUS_ARCHIVED) {
            throw ValidationException::withMessages([
                'business_status' => 'Usaha yang diarsipkan harus dipulihkan sebelum dapat diedit.',
            ]);
        }

        $validated = $request->validated();

        DB::transaction(function () use ($validated, $business) {
            $business->name = $validated['name'];
            $business->business_type = $validated['business_type'];
            $business->city = $validated['city'] ?? null;
            $business->province = $validated['province'] ?? null;
            $business->address = $validated['address'] ?? null;
            $business->save();

            $business->businessProfile()->updateOrCreate([], [
                'room_count' => $validated['room_count'] ?? null,
                'occupied_room_count' => $validated['occupied_room_count'] ?? null,
                'employee_count' => $validated['employee_count'] ?? null,
                'operating_days_per_month' => $validated['operating_days_per_month'] ?? null,
                'notes' => $validated['business_notes'] ?? null,
            ]);

            $business->electricityProfile()->updateOrCreate([], [
                'customer_type' => $validated['customer_type'] ?? null,
                'power_va' => $validated['power_va'] ?? null,
                'tariff_per_kwh' => $validated['tariff_per_kwh'] ?? null,
                'payment_method' => $validated['payment_method'] ?? null,
                'meter_type' => $validated['meter_type'] ?? null,
                'notes' => $validated['electricity_notes'] ?? null,
            ]);
        });

        return redirect()
            ->route('businesses.index')
            ->with('success', 'Data usaha/properti berhasil diperbarui.');
    }

    /**
     * Archive the specified business.
     */
    public function archive(Request $request, Business $business): RedirectResponse
    {
        Gate::authorize('archive', $business);

        if ($business->status === Business::STATUS_ARCHIVED) {
            return redirect()
                ->route('businesses.index')
                ->with('success', 'Usaha atau properti berhasil diarsipkan. Seluruh data historis tetap tersimpan.');
        }

        $activeCount = $request->user()->businesses()->active()->count();

        if ($activeCount <= 1) {
            throw ValidationException::withMessages([
                'business_archive' => 'Minimal satu usaha atau properti harus tetap aktif.',
            ]);
        }

        $business->status = Business::STATUS_ARCHIVED;
        $business->save();

        return redirect()
            ->route('businesses.index')
            ->with('success', 'Usaha atau properti berhasil diarsipkan. Seluruh data historis tetap tersimpan.');
    }

    /**
     * Restore the specified business.
     */
    public function restore(Request $request, Business $business): RedirectResponse
    {
        Gate::authorize('restore', $business);

        if ($business->status === Business::STATUS_ACTIVE) {
            return redirect()
                ->route('businesses.index')
                ->with('success', 'Usaha atau properti berhasil dipulihkan dan kembali aktif.');
        }

        $user = $request->user();
        $limit = $this->featureGateService->limit($user, 'businesses.multiple');
        $activeCount = $user->businesses()->active()->count();

        if ($limit !== null && $activeCount >= $limit) {
            throw ValidationException::withMessages([
                'business_limit' => 'Batas usaha aktif untuk paket Anda telah tercapai. Arsipkan usaha lain atau tingkatkan paket sebelum memulihkan usaha ini.',
            ]);
        }

        $business->status = Business::STATUS_ACTIVE;
        $business->save();

        return redirect()
            ->route('businesses.index')
            ->with('success', 'Usaha atau properti berhasil dipulihkan dan kembali aktif.');
    }
}
