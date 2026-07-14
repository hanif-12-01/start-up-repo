<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreElectricityEntryRequest;
use App\Models\Business;
use App\Models\ElectricityEntry;
use App\Services\ActiveBusinessResolver;
use App\Services\Electricity\ElectricityCalculator;
use App\Services\FeatureGateService;
use App\Services\Predictions\MachineLearning\PredictionEvaluationService;
use App\Services\Predictions\MachineLearning\PredictionShadowOrchestrator;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class ElectricityEntryController extends Controller
{
    protected ElectricityCalculator $calculator;

    protected FeatureGateService $featureGateService;

    public function __construct(
        ElectricityCalculator $calculator,
        FeatureGateService $featureGateService
    ) {
        $this->calculator = $calculator;
        $this->featureGateService = $featureGateService;
    }

    /**
     * Display a listing of electricity entries.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $resolver = app(ActiveBusinessResolver::class);
        $activeBusiness = $resolver->resolve($request);
        $businesses = $resolver->activeBusinesses($request);
        $entries = [];
        $meterHistory = [];

        if ($activeBusiness) {
            $entries = $activeBusiness->electricityEntries()
                ->orderBy('period_month', 'desc')
                ->get();

            $meterHistory = ElectricityEntry::query()
                ->where('business_id', $activeBusiness->id)
                ->whereNotNull('meter_end')
                ->select(['period_month', 'meter_end'])
                ->orderBy('period_month', 'desc')
                ->get()
                ->map(fn (ElectricityEntry $entry): array => [
                    'period_month' => substr((string) $entry->period_month, 0, 10),
                    'meter_end' => (float) $entry->meter_end,
                ])
                ->toArray();
        }

        $effectivePlan = $activeBusiness ? $this->featureGateService->getEffectivePlan($user, $activeBusiness) : null;
        $electricityLimit = $activeBusiness ? $this->featureGateService->limit($user, 'electricity.entries', $activeBusiness) : null;

        $ocrConfig = [
            'enabled' => (bool) config('meter_ocr.enabled'),
            'driver' => config('meter_ocr.driver', 'browser'),
            'minimum_confidence' => (int) config('meter_ocr.minimum_confidence', 75),
            'maximum_file_size_kb' => (int) config('meter_ocr.maximum_file_size_kb', 8192),
            'maximum_image_dimension' => (int) config('meter_ocr.maximum_image_dimension', 2400),
            'processing_timeout_seconds' => (int) config('meter_ocr.processing_timeout_seconds', 30),
        ];

        return Inertia::render('Electricity/Index', [
            'businesses' => $businesses,
            'activeBusinessId' => $activeBusiness ? $activeBusiness->id : null,
            'entries' => $entries,
            'effectivePlan' => $effectivePlan,
            'electricityLimit' => $electricityLimit,
            'meterHistory' => $meterHistory,
            'ocrConfig' => $ocrConfig,
        ]);
    }

    /**
     * Store a newly created resource in storage or update existing if it matches business_id + period_month.
     */
    public function store(StoreElectricityEntryRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        // Normalize period_month to the first day of the month
        $periodMonth = Carbon::parse($validated['period_month'])->startOfMonth();

        $businessId = $validated['business_id'];

        // Enforce plan limit for new entries
        $exists = ElectricityEntry::where('business_id', $businessId)
            ->where('period_month', $periodMonth)
            ->exists();

        if (! $exists) {
            $user = $request->user();
            $business = Business::where('id', $businessId)->first();
            $limit = $this->featureGateService->limit($user, 'electricity.entries', $business);
            if ($limit !== null) {
                $usage = $this->featureGateService->usage($user, 'electricity.entries', $business);
                if ($usage >= $limit) {
                    Inertia::flash('toast', [
                        'type' => 'error',
                        'message' => $this->featureGateService->getUpgradeMessage('electricity.entries'),
                    ]);

                    return redirect()->back()->with('error', $this->featureGateService->getUpgradeMessage('electricity.entries'));
                }
            }
        }

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
                'business_id' => $businessId,
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

        $this->triggerShadowEvaluation($businessId, $periodMonth, $usageKwh);

        return redirect()->back()->with('success', 'Data listrik berhasil disimpan.');
    }

    private function triggerShadowEvaluation(int $businessId, Carbon $periodMonth, ?float $usageKwh): void
    {
        if (! config('prediction.shadow_enabled', false)) {
            return;
        }

        try {
            $business = Business::with(['electricityProfile'])->find($businessId);
            if (! $business) {
                return;
            }

            $entries = $business->electricityEntries()
                ->orderBy('period_month', 'asc')
                ->get();

            $history = [];
            foreach ($entries as $entry) {
                if ($entry->usage_kwh === null) {
                    continue;
                }
                $history[] = [
                    'period_month' => Carbon::parse($entry->period_month)->format('Y-m'),
                    'usage_kwh' => (float) $entry->usage_kwh,
                ];
            }

            if (empty($history)) {
                return;
            }

            $tariff = $business->electricityProfile?->tariff_per_kwh
                ? (float) $business->electricityProfile->tariff_per_kwh
                : null;

            if ($tariff === null) {
                $latestWithTariff = $entries->whereNotNull('tariff_per_kwh')->last();
                $tariff = $latestWithTariff ? (float) $latestWithTariff->tariff_per_kwh : null;
            }

            $lastHistoryEntry = end($history);
            $lastPeriod = Carbon::parse($lastHistoryEntry['period_month'].'-01');
            $targetPeriod = $lastPeriod->copy()->addMonth()->format('Y-m');

            $orchestrator = app(PredictionShadowOrchestrator::class);
            $orchestrator->execute(
                $businessId,
                $targetPeriod,
                $history,
                $business->business_type ?? 'OTHER',
                $tariff,
                'electricity_entry',
            );

            if ($usageKwh !== null) {
                $evalService = app(PredictionEvaluationService::class);
                $evalService->evaluateForActual($businessId, $periodMonth->format('Y-m'), $usageKwh);
            }
        } catch (\Throwable $e) {
            Log::warning('Shadow evaluation failed safely', ['error' => $e->getMessage()]);
        }
    }
}
