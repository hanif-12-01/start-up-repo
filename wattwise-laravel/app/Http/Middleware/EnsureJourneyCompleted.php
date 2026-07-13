<?php

namespace App\Http\Middleware;

use App\Services\JourneyStateResolver;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureJourneyCompleted
{
    public function __construct(
        private readonly JourneyStateResolver $resolver,
    ) {}

    public function handle(Request $request, Closure $next, string $scope = 'product'): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        if ($this->resolver->hasBusiness($user)) {
            return $next($request);
        }

        $planChosen = $this->resolver->hasCompletedInitialPlanChoice($user);

        if ($scope === 'onboarding') {
            if (! $planChosen) {
                return redirect()->route('getting-started.plan');
            }

            return $next($request);
        }

        // scope = product (default)
        if (! $planChosen) {
            return redirect()->route('getting-started.plan');
        }

        return redirect()->route('onboarding');
    }
}
