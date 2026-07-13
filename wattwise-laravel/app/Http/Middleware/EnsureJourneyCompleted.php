<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureJourneyCompleted
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        if ($user->businesses()->exists()) {
            return $next($request);
        }

        if ($user->initial_plan_selected_at === null) {
            return redirect()->route('getting-started.plan');
        }

        return redirect()->route('onboarding');
    }
}
