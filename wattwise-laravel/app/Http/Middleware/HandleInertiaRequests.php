<?php

namespace App\Http\Middleware;

use App\Services\ActiveBusinessResolver;
use App\Services\Billing\BillingAvailability;
use App\Services\FeatureGateService;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user,
            ],
            // Standardized effective plan contract, resolved server-side for the
            // authenticated user. Null for guests. This is the single source of
            // truth for plan state across every page — never assume a demo plan.
            'effectivePlan' => $user
                ? app(FeatureGateService::class)->getEffectivePlan($user)
                : null,
            'businessContext' => fn () => $user ? [
                'activeBusinesses' => app(ActiveBusinessResolver::class)->activeBusinesses($request)->map(fn ($b) => [
                    'id' => $b->id,
                    'name' => $b->name,
                    'business_type' => $b->business_type,
                ])->values()->toArray(),
                'activeBusiness' => ($active = app(ActiveBusinessResolver::class)->resolve($request)) ? [
                    'id' => $active->id,
                    'name' => $active->name,
                    'business_type' => $active->business_type,
                ] : null,
            ] : [
                'activeBusinesses' => [],
                'activeBusiness' => null,
            ],
            // Whether the authenticated user still needs onboarding (has no
            // business yet). Drives conditional visibility of the Onboarding
            // navigation item — hidden once onboarding is complete.
            'needsOnboarding' => $user ? ! $user->businesses()->exists() : false,
            'needsInitialPlan' => $user ? $user->initial_plan_selected_at === null && ! $user->businesses()->exists() : false,
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'billingEnabled' => app(BillingAvailability::class)->enabled(),
        ];
    }
}
