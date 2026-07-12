<?php

namespace App\Http\Middleware;

use App\Services\Billing\BillingAvailability;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureBillingEnabled
{
    public function __construct(
        private readonly BillingAvailability $billingAvailability,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        if (! $this->billingAvailability->enabled()) {
            abort(404);
        }

        return $next($request);
    }
}
