<?php

namespace App\Services\Demo;

use App\Models\Business;
use App\Models\Subscription;
use App\Models\User;
use App\Support\DemoAccount;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class DemoLoginReadinessService
{
    public function check(): DemoLoginReadinessResult
    {
        try {
            if (! DemoAccount::enabled()) {
                return DemoLoginReadinessResult::failed(DemoLoginReadinessReason::FeatureDisabled);
            }

            if (! DemoAccount::environmentAllowed()) {
                return DemoLoginReadinessResult::failed(DemoLoginReadinessReason::UnsafeEnvironment);
            }

            $user = User::query()->where('email', DemoAccount::EMAIL)->first();
            if ($user === null) {
                return DemoLoginReadinessResult::failed(DemoLoginReadinessReason::MissingUser);
            }

            if ($user->email_verified_at === null) {
                return DemoLoginReadinessResult::failed(DemoLoginReadinessReason::UnverifiedEmail);
            }

            if ($user->initial_plan_selected_at === null) {
                return DemoLoginReadinessResult::failed(DemoLoginReadinessReason::MissingInitialPlanSelection);
            }

            if (! Hash::check(DemoAccount::PASSWORD, $user->password)) {
                return DemoLoginReadinessResult::failed(DemoLoginReadinessReason::InvalidPassword);
            }

            if (! Auth::validate(['email' => DemoAccount::EMAIL, 'password' => DemoAccount::PASSWORD])) {
                return DemoLoginReadinessResult::failed(DemoLoginReadinessReason::AuthValidationFailed);
            }

            return $this->checkData($user);
        } catch (\Throwable) {
            return DemoLoginReadinessResult::failed(DemoLoginReadinessReason::DatabaseUnavailable);
        }
    }

    /** @return array{enabled: bool, ready: bool, available: bool, credentials?: array{email: string, password: string}, message?: string} */
    public function publicState(): array
    {
        $operationAllowed = DemoAccount::operationAllowed();
        $isReady = false;

        if ($operationAllowed) {
            try {
                $result = $this->check();
                $isReady = $result->ready;
            } catch (\Throwable $e) {
                $isReady = false;
            }
        }

        $state = [
            'enabled' => $operationAllowed,
            'ready' => $isReady,
            'available' => $isReady,
        ];

        if ($operationAllowed) {
            if ($isReady) {
                $state['credentials'] = [
                    'email' => DemoAccount::EMAIL,
                    'password' => DemoAccount::PASSWORD,
                ];
            } else {
                $state['message'] = 'Demo sementara tidak tersedia.';
            }
        }

        return $state;
    }

    private function checkData(User $user): DemoLoginReadinessResult
    {
        /** @var Business|null $business */
        $business = $user->businesses()
            ->where('name', DemoAccount::BUSINESS_NAME)
            ->where('status', Business::STATUS_ACTIVE)
            ->first();

        if ($business === null) {
            return DemoLoginReadinessResult::failed(DemoLoginReadinessReason::MissingBusiness);
        }

        return $this->checkBaseline($user, $business);
    }

    private function checkBaseline(User $user, Business $business): DemoLoginReadinessResult
    {
        $businessProfileReady = $business->businessProfile()
            ->whereNotNull('room_count')
            ->whereNotNull('occupied_room_count')
            ->whereNotNull('employee_count')
            ->whereNotNull('operating_days_per_month')
            ->exists();
        $electricityProfileReady = $business->electricityProfile()
            ->whereNotNull('customer_type')
            ->whereNotNull('power_va')
            ->whereNotNull('tariff_per_kwh')
            ->whereNotNull('payment_method')
            ->exists();
        $electricityBaselineReady = $business->electricityEntries()
            ->whereNotNull('usage_kwh')
            ->whereNotNull('bill_amount_idr')
            ->whereNotNull('meter_start')
            ->whereNotNull('meter_end')
            ->whereNotNull('tariff_per_kwh')
            ->count() >= DemoAccount::MIN_ELECTRICITY_ENTRIES;
        $revenueBaselineReady = $business->revenueEntries()
            ->whereNotNull('revenue_amount_idr')
            ->count() >= DemoAccount::MIN_REVENUE_ENTRIES;
        $applianceBaselineReady = $business->appliances()
            ->whereNotNull('name')
            ->whereNotNull('watt')
            ->whereNotNull('hours_per_day')
            ->whereNotNull('days_per_month')
            ->count() >= DemoAccount::MIN_APPLIANCES;

        $ready = $businessProfileReady
            && $electricityProfileReady
            && $electricityBaselineReady
            && $revenueBaselineReady
            && $applianceBaselineReady;

        if (! $ready) {
            return DemoLoginReadinessResult::failed(DemoLoginReadinessReason::MissingBaseline);
        }

        return $this->checkSubscription($user);
    }

    private function checkSubscription(User $user): DemoLoginReadinessResult
    {
        /** @var Subscription|null $subscription */
        $subscription = $user->subscription;
        if ($subscription === null) {
            return DemoLoginReadinessResult::failed(DemoLoginReadinessReason::MissingSubscription);
        }

        $trialEnds = $subscription->trial_ends_at ? Carbon::parse((string) $subscription->trial_ends_at) : null;
        $periodEnds = $subscription->current_period_ends_at ? Carbon::parse((string) $subscription->current_period_ends_at) : null;

        $usable = strtoupper($subscription->plan) === DemoAccount::SUBSCRIPTION_PLAN
            && strtoupper($subscription->status) === 'ACTIVE'
            && (($trialEnds?->isFuture() === true) || ($periodEnds?->isFuture() === true));

        return $usable
            ? DemoLoginReadinessResult::ready()
            : DemoLoginReadinessResult::failed(DemoLoginReadinessReason::UnusableSubscription);
    }
}
