<?php

namespace App\Services;

use App\Models\Business;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class ActiveBusinessResolver
{
    /**
     * Get all active businesses for the authenticated user.
     * Ordered deterministically by name, then ID.
     */
    public function activeBusinesses(Request $request): Collection
    {
        $user = $request->user();
        if (!$user) {
            return collect();
        }

        if ($request->attributes->has('resolved_active_businesses')) {
            return $request->attributes->get('resolved_active_businesses');
        }

        $businesses = $user->businesses()
            ->active()
            ->orderBy('name')
            ->orderBy('id')
            ->get();

        $request->attributes->set('resolved_active_businesses', $businesses);

        return $businesses;
    }

    /**
     * Resolve the active business based on session or query parameters.
     */
    public function resolve(Request $request): ?Business
    {
        $user = $request->user();
        if (!$user) {
            return null;
        }

        if ($request->attributes->has('resolved_active_business')) {
            return $request->attributes->get('resolved_active_business');
        }

        $activeBusinesses = $this->activeBusinesses($request);
        if ($activeBusinesses->isEmpty()) {
            if ($request->session()->has('active_business_id')) {
                $request->session()->forget('active_business_id');
            }
            $request->attributes->set('resolved_active_business', null);
            return null;
        }

        $sessionKey = 'active_business_id';
        $queryId = $request->query('business_id');
        $sessionId = $request->session()->get($sessionKey);

        $resolvedBusiness = null;

        // 1. Check legacy query parameter if it exists
        if ($queryId !== null) {
            $queryId = (int) $queryId;
            $matched = $activeBusinesses->firstWhere('id', $queryId);
            if ($matched) {
                // Valid query selection: update session and use it
                $request->session()->put($sessionKey, $queryId);
                $resolvedBusiness = $matched;
            } else {
                // Invalid query selection: do not return another user's data
                // and do not overwrite a valid session selection.
                if ($sessionId !== null) {
                    $resolvedBusiness = $activeBusinesses->firstWhere('id', (int) $sessionId);
                }
            }
        } else {
            // 2. Read session selection if query parameter is missing
            if ($sessionId !== null) {
                $resolvedBusiness = $activeBusinesses->firstWhere('id', (int) $sessionId);
            }
        }

        // 3. Fallback: if selection is missing or stale (e.g. archived or other user's)
        if (!$resolvedBusiness) {
            $resolvedBusiness = $activeBusinesses->first();
            if ($resolvedBusiness) {
                // Repair the session with the fallback selection
                $request->session()->put($sessionKey, $resolvedBusiness->id);
            } else {
                $request->session()->forget($sessionKey);
            }
        }

        $request->attributes->set('resolved_active_business', $resolvedBusiness);

        return $resolvedBusiness;
    }

    /**
     * Select a specific active business and persist it to the session.
     */
    public function select(Request $request, int $businessId): Business
    {
        $activeBusinesses = $this->activeBusinesses($request);
        $business = $activeBusinesses->firstWhere('id', $businessId);

        if (!$business) {
            throw new \InvalidArgumentException("Usaha aktif yang dipilih tidak tersedia.");
        }

        $request->session()->put('active_business_id', $business->id);
        $request->attributes->set('resolved_active_business', $business);

        return $business;
    }

    /**
     * Clear the active business selection.
     */
    public function forget(Request $request): void
    {
        $request->session()->forget('active_business_id');
        $request->attributes->remove('resolved_active_business');
    }
}
