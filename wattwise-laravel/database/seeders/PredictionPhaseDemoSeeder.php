<?php

namespace Database\Seeders;

use App\Models\Business;
use App\Models\BusinessProfile;
use App\Models\ElectricityEntry;
use App\Models\ElectricityProfile;
use App\Models\RevenueEntry;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;

class PredictionPhaseDemoSeeder extends Seeder
{
    /**
     * Four deterministic accounts representing the phase-aware history buckets.
     * Upper-bound representatives catch inclusive-boundary errors at 2, 5, and 12 months.
     *
     * @var array<int, array{phase: string, label: string, email: string, user_name: string, business_name: string, history_months: int}>
     */
    public const ACCOUNT_SPECS = [
        [
            'phase' => 'HISTORY_0_2',
            'label' => '0-2 bulan',
            'email' => 'demo.ml.0-2@wattwise.local',
            'user_name' => 'Demo ML 0-2 Bulan',
            'business_name' => 'Demo Kos Histori 0-2 Bulan',
            'history_months' => 2,
        ],
        [
            'phase' => 'HISTORY_3_5',
            'label' => '3-5 bulan',
            'email' => 'demo.ml.3-5@wattwise.local',
            'user_name' => 'Demo ML 3-5 Bulan',
            'business_name' => 'Demo Kos Histori 3-5 Bulan',
            'history_months' => 5,
        ],
        [
            'phase' => 'HISTORY_6_12',
            'label' => '6-12 bulan',
            'email' => 'demo.ml.6-12@wattwise.local',
            'user_name' => 'Demo ML 6-12 Bulan',
            'business_name' => 'Demo Kos Histori 6-12 Bulan',
            'history_months' => 12,
        ],
        [
            'phase' => 'HISTORY_OVER_12',
            'label' => '>12 bulan',
            'email' => 'demo.ml.over-12@wattwise.local',
            'user_name' => 'Demo ML Lebih dari 12 Bulan',
            'business_name' => 'Demo Kos Histori Lebih dari 12 Bulan',
            'history_months' => 18,
        ],
    ];

    /**
     * Shared 18-month reference series. Every shorter account receives the tail
     * of this same series so history depth is the primary changing variable.
     *
     * @var array<int, float>
     */
    private const USAGE_SERIES = [
        720.0,
        735.0,
        748.0,
        760.0,
        782.0,
        795.0,
        810.0,
        828.0,
        845.0,
        860.0,
        885.0,
        900.0,
        920.0,
        938.0,
        955.0,
        970.0,
        990.0,
        1010.0,
    ];

    private const TARIFF_PER_KWH = 1444.70;

    /**
     * Create or refresh all four phase accounts.
     *
     * This seeder is deliberately opt-in and refuses production. It never logs
     * or stores the plain-text password outside the process/config value.
     */
    public function run(): void
    {
        $this->assertOperationAllowed();
        $password = $this->resolvePassword();

        foreach (self::ACCOUNT_SPECS as $spec) {
            $this->seedAccount($spec, $password);
        }
    }

    private function assertOperationAllowed(): void
    {
        if (! app()->environment('local', 'testing', 'staging')) {
            throw new \RuntimeException(
                'Refusing to seed prediction phase demo accounts outside local/testing/staging.'
            );
        }

        if (! (bool) config('demo.phase_accounts.enabled', false)) {
            throw new \RuntimeException(
                'Prediction phase demo accounts are disabled. Set DEMO_PHASE_ACCOUNTS_ENABLED=true.'
            );
        }
    }

    private function resolvePassword(): string
    {
        $password = (string) config('demo.phase_accounts.password', '');

        $isStrongEnough = strlen($password) >= 12
            && preg_match('/[A-Z]/', $password) === 1
            && preg_match('/[a-z]/', $password) === 1
            && preg_match('/[0-9]/', $password) === 1
            && preg_match('/[^A-Za-z0-9]/', $password) === 1;

        if (! $isStrongEnough) {
            throw new \RuntimeException(
                'DEMO_PHASE_ACCOUNTS_PASSWORD must be at least 12 characters and contain uppercase, lowercase, number, and symbol.'
            );
        }

        return $password;
    }

    /**
     * @param  array{phase: string, label: string, email: string, user_name: string, business_name: string, history_months: int}  $spec
     */
    private function seedAccount(array $spec, string $password): void
    {
        $user = User::updateOrCreate(
            ['email' => $spec['email']],
            [
                'name' => $spec['user_name'],
                'password' => Hash::make($password),
            ],
        );

        $user->forceFill([
            'email_verified_at' => $user->email_verified_at ?? now(),
            'initial_plan_selected_at' => $user->initial_plan_selected_at ?? now(),
        ])->save();

        $business = Business::updateOrCreate(
            [
                'user_id' => $user->id,
                'name' => $spec['business_name'],
            ],
            [
                'business_type' => 'KOS_PROPERTY',
                'city' => 'Purwokerto',
                'province' => 'Jawa Tengah',
                'status' => 'ACTIVE',
                'onboarding_completed_at' => now(),
            ],
        );

        BusinessProfile::updateOrCreate(
            ['business_id' => $business->id],
            [
                'room_count' => 20,
                'occupied_room_count' => 16,
                'employee_count' => 2,
                'operating_days_per_month' => 30,
            ],
        );

        ElectricityProfile::updateOrCreate(
            ['business_id' => $business->id],
            [
                'customer_type' => 'Bisnis/Rumah Tangga',
                'power_va' => 2200,
                'tariff_per_kwh' => self::TARIFF_PER_KWH,
                'payment_method' => 'Pascabayar',
            ],
        );

        Subscription::updateOrCreate(
            ['user_id' => $user->id],
            [
                'plan' => 'PRO_TRIAL',
                'status' => 'ACTIVE',
                'trial_starts_at' => now(),
                'trial_ends_at' => now()->addDays(30),
                'current_period_starts_at' => now(),
                'current_period_ends_at' => now()->addDays(30),
                'metadata' => [
                    'source' => 'prediction_phase_demo_seed',
                    'phase' => $spec['phase'],
                    'history_months' => $spec['history_months'],
                    'note' => 'Deterministic local/staging model-test fixture only',
                ],
            ],
        );

        $this->seedMonthlyHistory($business, $spec);
    }

    /**
     * @param  array{phase: string, label: string, email: string, user_name: string, business_name: string, history_months: int}  $spec
     */
    private function seedMonthlyHistory(Business $business, array $spec): void
    {
        ElectricityEntry::where('business_id', $business->id)->delete();
        RevenueEntry::where('business_id', $business->id)->delete();

        $monthCount = $spec['history_months'];
        $months = $this->completedMonths($monthCount);
        $usages = array_slice(self::USAGE_SERIES, -$monthCount);
        $seriesOffset = count(self::USAGE_SERIES) - $monthCount;
        $meterReading = 50000.0;

        foreach ($months as $index => $month) {
            $usageKwh = $usages[$index];
            $meterStart = $meterReading;
            $meterEnd = $meterStart + $usageKwh;
            $billAmount = round($usageKwh * self::TARIFF_PER_KWH, 2);
            $referenceIndex = $seriesOffset + $index;

            ElectricityEntry::create([
                'business_id' => $business->id,
                'period_month' => $month->format('Y-m-d'),
                'usage_kwh' => $usageKwh,
                'bill_amount_idr' => $billAmount,
                'meter_start' => $meterStart,
                'meter_end' => $meterEnd,
                'tariff_per_kwh' => self::TARIFF_PER_KWH,
                'payment_method' => 'Pascabayar',
                'notes' => sprintf(
                    'Fixture fase %s, bulan %d dari %d',
                    $spec['label'],
                    $index + 1,
                    $monthCount,
                ),
            ]);

            RevenueEntry::create([
                'business_id' => $business->id,
                'period_month' => $month->format('Y-m-d'),
                'revenue_amount_idr' => 10500000 + ($referenceIndex * 125000),
                'revenue_input_mode' => 'EXACT',
                'notes' => sprintf('Pendapatan fixture fase %s', $spec['label']),
            ]);

            $meterReading = $meterEnd;
        }
    }

    /**
     * Return consecutive completed months, ordered oldest to newest.
     * The current partial month is intentionally excluded from model fixtures.
     *
     * @return array<int, Carbon>
     */
    private function completedMonths(int $count): array
    {
        $latestCompletedMonth = now()->startOfMonth()->subMonth();
        $months = [];

        for ($offset = $count - 1; $offset >= 0; $offset--) {
            $months[] = $latestCompletedMonth->copy()->subMonths($offset);
        }

        return $months;
    }
}
