<?php

namespace App\Services;

use App\Models\Subscription;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class TrialActivationService
{
    /**
     * @return array{success: bool, message: string}
     */
    public function activate(User $user): array
    {
        return DB::transaction(function () use ($user): array {
            $user = User::lockForUpdate()->find($user->id);

            $subscription = $user->subscription()->lockForUpdate()->first();

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

            $now = Carbon::now();

            Subscription::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'plan' => 'PRO_TRIAL',
                    'status' => 'ACTIVE',
                    'trial_starts_at' => $now,
                    'trial_ends_at' => $now->copy()->addDays(30),
                ]
            );

            if ($user->initial_plan_selected_at === null) {
                $user->initial_plan_selected_at = now();
                $user->save();
            }

            return [
                'success' => true,
                'message' => 'Mulai Pro Trial 30 Hari berhasil diaktifkan! Anda kini memiliki akses penuh fitur Pro.',
            ];
        });
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
