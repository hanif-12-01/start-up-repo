<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreRevenueEntryRequest;
use App\Models\RevenueEntry;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RevenueEntryController extends Controller
{
    /**
     * Display a listing of revenue entries.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $businesses = $user->businesses()->get();
        $activeBusiness = null;
        $entries = [];

        if ($businesses->isNotEmpty()) {
            $activeBusinessId = $request->query('business_id');
            if ($activeBusinessId) {
                $activeBusiness = $businesses->firstWhere('id', $activeBusinessId);
            }
            if (!$activeBusiness) {
                $activeBusiness = $businesses->first();
            }

            if ($activeBusiness) {
                $entries = $activeBusiness->revenueEntries()
                    ->orderBy('period_month', 'desc')
                    ->get();
            }
        }

        return Inertia::render('Revenue/Index', [
            'businesses' => $businesses,
            'activeBusinessId' => $activeBusiness ? $activeBusiness->id : null,
            'entries' => $entries,
        ]);
    }

    /**
     * Store a newly created resource in storage or update existing if it matches business_id + period_month.
     */
    public function store(StoreRevenueEntryRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        // Normalize period_month to the first day of the month as a Carbon instance for Eloquent query safety
        $periodMonth = \Carbon\Carbon::parse($validated['period_month'])->startOfMonth();

        // Upsert by business_id + period_month
        RevenueEntry::updateOrCreate(
            [
                'business_id' => $validated['business_id'],
                'period_month' => $periodMonth,
            ],
            [
                'revenue_amount_idr' => $validated['revenue_amount_idr'] ?? null,
                'revenue_input_mode' => $validated['revenue_input_mode'],
                'notes' => $validated['notes'] ?? null,
            ]
        );

        return redirect()->back()->with('success', 'Data pendapatan berhasil disimpan.');
    }
}
