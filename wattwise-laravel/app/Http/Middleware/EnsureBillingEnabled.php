<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureBillingEnabled
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! config('billing.enabled')) {
            abort(404);
        }

        if (config('billing.driver') !== 'sandbox') {
            abort(404);
        }

        if (app()->environment('production')) {
            abort(404);
        }

        return $next($request);
    }
}
