<?php

namespace App\Services\Demo;

use App\Models\Business;
use App\Models\User;
use App\Support\DemoAccount;
use Carbon\Carbon;

final class DemoMlScenarioReadinessService
{
    public function check(?User $user = null): DemoMlScenarioReadinessResult
    {
        $user ??= User::query()->where('email', DemoAccount::EMAIL)->first();
        if ($user === null || $user->email !== DemoAccount::EMAIL) {
            return new DemoMlScenarioReadinessResult(false, 'MISSING_DEMO_USER', []);
        }

        $scenarios = [];
        $allReady = true;

        foreach (DemoAccount::ML_SCENARIOS as $definition) {
            $business = $user->businesses()
                ->where('name', $definition['business_name'])
                ->first();

            $periods = $business?->electricityEntries()
                ->whereNotNull('usage_kwh')
                ->orderBy('period_month')
                ->pluck('period_month')
                ->map(fn ($period): Carbon => Carbon::parse((string) $period)->startOfDay())
                ->values() ?? collect();

            $actualHistory = $periods->count();
            $detectedPhase = DemoMlValidationService::phaseForMonths($actualHistory);
            $historyReady = $actualHistory === (int) $definition['history_months'];
            $periodsReady = $this->periodsAreMonthlyAndContiguous($periods->all());
            $scenarioReady = $business !== null
                && $business->user_id === $user->id
                && $business->status === Business::STATUS_ACTIVE
                && $historyReady
                && $periodsReady
                && $detectedPhase === $definition['expected_phase'];

            $scenarios[] = [
                'business_name' => $definition['business_name'],
                'expected_history_months' => (int) $definition['history_months'],
                'actual_history_months' => $actualHistory,
                'expected_phase' => $definition['expected_phase'],
                'detected_phase' => $detectedPhase,
                'ready' => $scenarioReady,
            ];

            $allReady = $allReady && $scenarioReady;
        }

        return new DemoMlScenarioReadinessResult(
            $allReady,
            $allReady ? 'READY' : 'ML_SCENARIOS_NOT_READY',
            $scenarios,
        );
    }

    /** @param list<Carbon> $periods */
    private function periodsAreMonthlyAndContiguous(array $periods): bool
    {
        if ($periods === []) {
            return true;
        }

        $months = [];
        foreach ($periods as $index => $period) {
            if ($period->day !== 1) {
                return false;
            }

            $month = $period->format('Y-m');
            if (in_array($month, $months, true)) {
                return false;
            }
            $months[] = $month;

            if ($index > 0 && ! $periods[$index - 1]->copy()->addMonth()->equalTo($period)) {
                return false;
            }
        }

        return true;
    }
}
