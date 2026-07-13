<?php

namespace App\Services;

use App\Models\Subscription;
use App\Models\User;
use Illuminate\Support\Carbon;

class TrialActivationService
{
    /**
     * @return array{success: bool, message: string}
     */
    public function activate(User $user): array
    {
        $subscription = $user->subscription()->first();

        if ($subscription && $subscription->trial_ends_at !== null) {
            return [
                'success' => false,
                'message' => 'Anda sudah pernah menggunakan masa uji coba (trial) sebelumnya.',
            ];
        }

        if ($subscription
            && ! in_array(strtoupper($subscription->plan), ['FREE', 'PRO_TRIAL'])
            && strtoupper($subscription->status) === 'ACTIVE') {
            return [
                'success' => false,
                'message' => 'Anda sudah memiliki langganan berbayar yang aktif.',
            ];
        }

        Subscription::updateOrCreate(
            ['user_id' => $user->id],
            [
                'plan' => 'PRO_TRIAL',
                'status' => 'ACTIVE',
                'trial_starts_at' => Carbon::now(),
                'trial_ends_at' => Carbon::now()->addDays(30),
            ]
        );

        return [
            'success' => true,
            'message' => 'Mulai Pro Trial 30 Hari berhasil diaktifkan! Anda kini memiliki akses penuh fitur Pro.',
        ];
    }

    public function isEligible(User $user): bool
    {
        $subscription = $user->subscription()->first();

        if (! $subscription) {
            return true;
        }

        if ($subscription->trial_ends_at !== null) {
            return false;
        }

        if (! in_array(strtoupper($subscription->plan), ['FREE', 'PRO_TRIAL'])
            && strtoupper($subscription->status) === 'ACTIVE') {
            return false;
        }

        return true;
    }
}
