<?php

namespace App\Services;

use App\Models\User;
use App\Models\Business;
use App\Models\Subscription;
use App\Models\ElectricityEntry;
use App\Models\RevenueEntry;
use App\Models\Appliance;

class FeatureGateService
{
    private const PLANS = [
        'FREE' => [
            'label' => 'Gratis',
            'features' => [
                'dashboard.view' => true,
                'onboarding.use' => true,
                'appliances.templates' => false,
                'recommendations.view' => true,
                'reports.view' => true,
                'reports.full' => false,
                'export.pdf' => false,
                'ads.hidden' => false,
            ],
            'limits' => [
                'electricity.entries' => 3,
                'revenue.entries' => 3,
                'appliances.manage' => 10,
                'businesses.multiple' => 1,
                'team.members' => 0,
            ]
        ],
        'PRO_TRIAL' => [
            'label' => 'Pro Trial 30 Hari',
            'features' => [
                'dashboard.view' => true,
                'onboarding.use' => true,
                'appliances.templates' => true,
                'recommendations.view' => true,
                'reports.view' => true,
                'reports.full' => true,
                'export.pdf' => false,
                'ads.hidden' => true,
            ],
            'limits' => [
                'electricity.entries' => null,
                'revenue.entries' => null,
                'appliances.manage' => null,
                'businesses.multiple' => 1,
                'team.members' => 0,
            ]
        ],
        'PRO' => [
            'label' => 'Pro',
            'features' => [
                'dashboard.view' => true,
                'onboarding.use' => true,
                'appliances.templates' => true,
                'recommendations.view' => true,
                'reports.view' => true,
                'reports.full' => true,
                'export.pdf' => false,
                'ads.hidden' => true,
            ],
            'limits' => [
                'electricity.entries' => null,
                'revenue.entries' => null,
                'appliances.manage' => null,
                'businesses.multiple' => 1,
                'team.members' => 0,
            ]
        ],
        'BUSINESS' => [
            'label' => 'Business',
            'features' => [
                'dashboard.view' => true,
                'onboarding.use' => true,
                'appliances.templates' => true,
                'recommendations.view' => true,
                'reports.view' => true,
                'reports.full' => true,
                'export.pdf' => false,
                'ads.hidden' => true,
            ],
            'limits' => [
                'electricity.entries' => null,
                'revenue.entries' => null,
                'appliances.manage' => null,
                'businesses.multiple' => 5,
                'team.members' => 5,
            ]
        ],
        'ENTERPRISE' => [
            'label' => 'Enterprise / Custom',
            'features' => [
                'dashboard.view' => true,
                'onboarding.use' => true,
                'appliances.templates' => true,
                'recommendations.view' => true,
                'reports.view' => true,
                'reports.full' => true,
                'export.pdf' => false,
                'ads.hidden' => true,
            ],
            'limits' => [
                'electricity.entries' => null,
                'revenue.entries' => null,
                'appliances.manage' => null,
                'businesses.multiple' => null,
                'team.members' => null,
            ]
        ]
    ];

    /**
     * Get the effective active plan for a user.
     * Evaluates trial status expiration.
     *
     * @param User $user
     * @param Business|null $business
     * @return array
     */
    public function getEffectivePlan(User $user, ?Business $business = null): array
    {
        $subscription = $user->subscription;

        if (!$subscription) {
            return [
                'id' => 'FREE',
                'label' => self::PLANS['FREE']['label'],
                'trial_ends_at' => null,
                'is_trial' => false,
                'is_expired' => false,
            ];
        }

        $planId = strtoupper($subscription->plan);

        if (!array_key_exists($planId, self::PLANS)) {
            $planId = 'FREE';
        }

        // Handle PRO_TRIAL expiration
        if ($planId === 'PRO_TRIAL') {
            $trialEnds = $subscription->trial_ends_at;
            $isExpired = $trialEnds && $trialEnds->isPast();

            if ($isExpired) {
                return [
                    'id' => 'FREE',
                    'label' => self::PLANS['FREE']['label'],
                    'trial_ends_at' => $trialEnds,
                    'is_trial' => true,
                    'is_expired' => true,
                ];
            }

            return [
                'id' => 'PRO_TRIAL',
                'label' => self::PLANS['PRO_TRIAL']['label'],
                'trial_ends_at' => $trialEnds,
                'is_trial' => true,
                'is_expired' => false,
            ];
        }

        // Handle other plans expiration/inactive status
        $currentPeriodEnds = $subscription->current_period_ends_at;
        $isExpired = $currentPeriodEnds && $currentPeriodEnds->isPast();
        $isInactive = strtoupper($subscription->status) !== 'ACTIVE';

        if ($isExpired || $isInactive) {
            return [
                'id' => 'FREE',
                'label' => self::PLANS['FREE']['label'],
                'trial_ends_at' => null,
                'is_trial' => false,
                'is_expired' => true,
            ];
        }

        return [
            'id' => $planId,
            'label' => self::PLANS[$planId]['label'],
            'trial_ends_at' => null,
            'is_trial' => false,
            'is_expired' => false,
        ];
    }

    /**
     * Check if a feature is enabled.
     *
     * @param User $user
     * @param string $featureKey
     * @param Business|null $business
     * @return bool
     */
    public function can(User $user, string $featureKey, ?Business $business = null): bool
    {
        $plan = $this->getEffectivePlan($user, $business);
        $planId = $plan['id'];

        return self::PLANS[$planId]['features'][$featureKey] ?? false;
    }

    /**
     * Get the limit value for a key. Returns null for unlimited.
     *
     * @param User $user
     * @param string $limitKey
     * @param Business|null $business
     * @return int|null
     */
    public function limit(User $user, string $limitKey, ?Business $business = null): ?int
    {
        $plan = $this->getEffectivePlan($user, $business);
        $planId = $plan['id'];

        return self::PLANS[$planId]['limits'][$limitKey] ?? null;
    }

    /**
     * Calculate current usage for a limit key.
     *
     * @param User $user
     * @param string $limitKey
     * @param Business|null $business
     * @return int
     */
    public function usage(User $user, string $limitKey, ?Business $business = null): int
    {
        if ($business === null) {
            $business = $user->businesses()->first();
        }

        switch ($limitKey) {
            case 'electricity.entries':
                if (!$business) return 0;
                return ElectricityEntry::where('business_id', $business->id)->count();

            case 'revenue.entries':
                if (!$business) return 0;
                return RevenueEntry::where('business_id', $business->id)->count();

            case 'appliances.manage':
                if (!$business) return 0;
                return Appliance::where('business_id', $business->id)->count();

            case 'businesses.multiple':
                return $user->businesses()->count();

            case 'team.members':
                return 0; // Future capability

            default:
                return 0;
        }
    }

    /**
     * Get upgrade prompt message.
     *
     * @param string $featureKey
     * @return string
     */
    public function getUpgradeMessage(string $featureKey): string
    {
        switch ($featureKey) {
            case 'appliances.templates':
                return 'Gunakan template peralatan instan untuk mempercepat input dengan paket Pro.';
            case 'appliances.manage':
                return 'Anda telah mencapai batas 10 peralatan listrik paket Gratis. Upgrade untuk menambah lebih banyak.';
            case 'electricity.entries':
                return 'Batas entri data listrik bulanan paket Gratis telah tercapai (maksimal 3 bulan). Upgrade ke Pro untuk menyimpan seluruh riwayat Anda.';
            case 'revenue.entries':
                return 'Batas entri pendapatan bulanan paket Gratis telah tercapai (maksimal 3 bulan). Upgrade ke Pro untuk menyimpan seluruh riwayat Anda.';
            case 'recommendations.view':
                return 'Buka seluruh rekomendasi penghematan energi detail dengan paket Pro.';
            case 'reports.full':
                return 'Akses laporan lengkap dan riwayat bulan-bulan sebelumnya dengan paket Pro.';
            case 'businesses.multiple':
                return 'Kelola beberapa bisnis atau properti sewaan secara terpusat dengan paket Business.';
            default:
                return 'Upgrade ke paket Premium untuk membuka fitur ini.';
        }
    }
}
