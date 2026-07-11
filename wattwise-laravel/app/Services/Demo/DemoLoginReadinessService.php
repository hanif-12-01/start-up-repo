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

            if (! Hash::check(DemoAccount::PASSWORD, $user->password)) {
                return DemoLoginReadinessResult::failed(DemoLoginReadinessReason::InvalidPassword);
            }

            if (! Auth::validate(['email' => DemoAccount::EMAIL, 'password' => DemoAccount::PASSWORD])) {
                return DemoLoginReadinessResult::failed(DemoLoginReadinessReason::AuthValidationFailed);
            }

            return $this->checkData($user);
        } catch (\Throwable $e) {
            return DemoLoginReadinessResult::failed(DemoLoginReadinessReason::FeatureDisabled);
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
        $ready = $business->businessProfile()->exists()
            && $business->electricityProfile()->exists()
            && $business->electricityEntries()->count() >= DemoAccount::MIN_ELECTRICITY_ENTRIES
            && $business->revenueEntries()->count() >= DemoAccount::MIN_REVENUE_ENTRIES
            && $business->appliances()->count() >= DemoAccount::MIN_APPLIANCES;

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
