<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreElectricityEntryRequest;
use App\Models\ElectricityEntry;
use App\Services\Electricity\ElectricityCalculator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ElectricityEntryController extends Controller
{
    protected ElectricityCalculator $calculator;

    public function __construct(ElectricityCalculator $calculator)
    {
        $this->calculator = $calculator;
    }

    /**
     * Display a listing of electricity entries.
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
                $entries = $activeBusiness->electricityEntries()
                    ->orderBy('period_month', 'desc')
                    ->get();
            }
        }

        return Inertia::render('Electricity/Index', [
            'businesses' => $businesses,
            'activeBusinessId' => $activeBusiness ? $activeBusiness->id : null,
            'entries' => $entries,
        ]);
    }

    /**
     * Store a newly created resource in storage or update existing if it matches business_id + period_month.
     */
    public function store(StoreElectricityEntryRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        // Normalize period_month to the first day of the month
        $periodMonth = \Carbon\Carbon::parse($validated['period_month'])->startOfMonth();

        $usageKwh = $validated['usage_kwh'] ?? null;
        $billAmountIdr = $validated['bill_amount_idr'] ?? null;
        $meterStart = $validated['meter_start'] ?? null;
        $meterEnd = $validated['meter_end'] ?? null;
        $tariffPerKwh = $validated['tariff_per_kwh'] ?? null;

        // 1. Calculate usage from meter readings if usage is empty
        if ($usageKwh === null && $meterStart !== null && $meterEnd !== null) {
            try {
                $usageKwh = $this->calculator->calculateUsageFromMeter($meterStart, $meterEnd);
            } catch (\InvalidArgumentException $e) {
                return redirect()->back()->withErrors(['meter_end' => $e->getMessage()]);
            }
        }

        // 2. Estimate bill amount if bill amount is empty
        if ($billAmountIdr === null && $usageKwh !== null && $tariffPerKwh !== null) {
            $billAmountIdr = $this->calculator->estimateBillAmount($usageKwh, $tariffPerKwh);
        }

        // Upsert by business_id + period_month
        ElectricityEntry::updateOrCreate(
            [
                'business_id' => $validated['business_id'],
                'period_month' => $periodMonth,
            ],
            [
                'usage_kwh' => $usageKwh,
                'bill_amount_idr' => $billAmountIdr,
                'meter_start' => $meterStart,
                'meter_end' => $meterEnd,
                'tariff_per_kwh' => $tariffPerKwh,
                'payment_method' => $validated['payment_method'] ?? null,
                'notes' => $validated['notes'] ?? null,
            ]
        );

        return redirect()->back()->with('success', 'Data listrik berhasil disimpan.');
    }
}
