<?php

namespace Database\Seeders;

use App\Models\Appliance;
use App\Models\Business;
use App\Models\BusinessProfile;
use App\Models\ElectricityEntry;
use App\Models\ElectricityProfile;
use App\Models\RevenueEntry;
use App\Models\Subscription;
use App\Models\User;
use App\Support\DemoAccount;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class WattWiseDemoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * WARNING: Do NOT run this seeder on a production environment.
     * This is strictly for local development and staging smoke tests.
     *
     * All data here is deterministic simulation/estimate data for demo purposes.
     * "Prediksi dan estimasi WattWise AI bersifat perkiraan berdasarkan data
     *  yang dimasukkan pengguna dan bukan tagihan resmi PLN."
     */
    public function run(): void
    {
        if (app()->environment('production')) {
            throw new \RuntimeException('Refusing to run demo seeder in production.');
        }

        if (! DemoAccount::environmentAllowed()) {
            throw new \RuntimeException('Refusing to run demo seeder in unsafe environment: '.app()->environment());
        }

        $user = $this->seedDemoUser();
        $this->seedSubscription($user);

        foreach (DemoAccount::ML_SCENARIOS as $scenarioKey => $scenario) {
            $business = $this->seedScenarioBusiness($user, $scenario);
            $this->seedScenarioProfiles($business, $scenario);
            $this->seedElectricityEntries(
                $business,
                $this->computeDemoMonths((int) $scenario['history_months']),
                $scenarioKey,
                $scenario,
            );

            if ($scenario['business_name'] === DemoAccount::BUSINESS_NAME) {
                $this->seedRevenueEntries($business, $this->computeDemoMonths(6));
                $this->seedAppliances($business);
            } else {
                // Keep the four validation-only businesses intentionally small.
                // Their purpose is history-phase and model-routing validation.
                RevenueEntry::where('business_id', $business->id)->delete();
                Appliance::where('business_id', $business->id)->delete();
            }
        }
    }

    private function seedDemoUser(): User
    {
        $user = User::updateOrCreate(
            ['email' => DemoAccount::EMAIL],
            [
                'name' => DemoAccount::USER_NAME,
                'password' => Hash::make(DemoAccount::PASSWORD),
            ]
        );

        if (is_null($user->email_verified_at)) {
            $user->forceFill(['email_verified_at' => now()])->save();
        }

        if (is_null($user->initial_plan_selected_at)) {
            $user->initial_plan_selected_at = now();
            $user->save();
        }

        return $user;
    }

    private function seedSubscription(User $user): void
    {
        Subscription::updateOrCreate(
            ['user_id' => $user->id],
            [
                'plan' => DemoAccount::SUBSCRIPTION_PLAN,
                'status' => 'ACTIVE',
                'trial_starts_at' => now(),
                'trial_ends_at' => now()->addDays(30),
                'current_period_starts_at' => now(),
                'current_period_ends_at' => now()->addDays(30),
                'metadata' => [
                    'source' => 'demo_seed',
                    'note' => 'Local/staging deterministic demo data only',
                    'ml_validation_scenarios' => array_keys(DemoAccount::ML_SCENARIOS),
                ],
            ]
        );
    }

    /** @param array<string, mixed> $scenario */
    private function seedScenarioBusiness(User $user, array $scenario): Business
    {
        return Business::updateOrCreate(
            [
                'user_id' => $user->id,
                'name' => $scenario['business_name'],
            ],
            [
                'business_type' => $scenario['business_type'],
                'city' => $scenario['city'],
                'province' => $scenario['province'],
                'status' => Business::STATUS_ACTIVE,
                'onboarding_completed_at' => now(),
            ]
        );
    }

    /** @param array<string, mixed> $scenario */
    private function seedScenarioProfiles(Business $business, array $scenario): void
    {
        $isKos = $scenario['business_type'] === 'KOS_PROPERTY';

        BusinessProfile::updateOrCreate(
            ['business_id' => $business->id],
            [
                'room_count' => $isKos ? 20 : 0,
                'occupied_room_count' => $isKos ? 16 : 0,
                'employee_count' => $isKos ? 2 : 4,
                'operating_days_per_month' => 30,
                'notes' => 'Skenario validasi ML '.$scenario['expected_phase'],
            ]
        );

        ElectricityProfile::updateOrCreate(
            ['business_id' => $business->id],
            [
                'customer_type' => 'Bisnis/Rumah Tangga',
                'power_va' => $isKos ? 2200 : 3500,
                'tariff_per_kwh' => 1444.70,
                'payment_method' => 'Pascabayar',
            ]
        );
    }

    /**
     * Compute consecutive demo months ending at the current month.
     *
     * @return Carbon[]
     */
    private function computeDemoMonths(int $count): array
    {
        if ($count <= 0) {
            return [];
        }

        $current = now()->startOfMonth();
        $months = [];

        for ($i = $count - 1; $i >= 0; $i--) {
            $months[] = Carbon::instance($current->copy()->subMonths($i));
        }

        return $months;
    }

    /**
     * Seed deterministic monthly electricity entries for a validation scenario.
     *
     * @param Carbon[] $months
     * @param array<string, mixed> $scenario
     */
    private function seedElectricityEntries(
        Business $business,
        array $months,
        string $scenarioKey,
        array $scenario,
    ): void {
        ElectricityEntry::where('business_id', $business->id)->delete();

        if ($months === []) {
            return;
        }

        $tariff = 1444.70;
        $meterBase = 40000.0 + (abs(crc32($business->name)) % 10000);
        $baseUsage = (float) $scenario['base_usage_kwh'];
        $monthlyTrend = (float) $scenario['monthly_trend_kwh'];
        $seasonalOffsets = [0.0, 18.0, 35.0, 22.0, -8.0, -24.0, -15.0, 6.0, 31.0, 46.0, 24.0, -4.0];
        $cumulativeKwh = 0.0;

        foreach ($months as $index => $month) {
            $seasonal = $seasonalOffsets[((int) $month->format('n')) - 1];
            $usageKwh = max(0.0, round($baseUsage + ($index * $monthlyTrend) + $seasonal, 2));
            $meterStart = round($meterBase + $cumulativeKwh, 2);
            $meterEnd = round($meterStart + $usageKwh, 2);

            ElectricityEntry::create([
                'business_id' => $business->id,
                'period_month' => $month->format('Y-m-d'),
                'usage_kwh' => $usageKwh,
                'bill_amount_idr' => round($usageKwh * $tariff, 2),
                'meter_start' => $meterStart,
                'meter_end' => $meterEnd,
                'tariff_per_kwh' => $tariff,
                'payment_method' => 'Pascabayar',
                'notes' => sprintf(
                    'Data sintetis demo %s (%s), bukan tagihan resmi PLN.',
                    $scenario['expected_phase'],
                    $scenarioKey,
                ),
            ]);

            $cumulativeKwh += $usageKwh;
        }
    }

    /**
     * Seed six months of deterministic revenue data for the primary demo business.
     *
     * @param Carbon[] $months
     */
    private function seedRevenueEntries(Business $business, array $months): void
    {
        RevenueEntry::where('business_id', $business->id)->delete();

        $patterns = [
            [10400000, '13 kamar terisi'],
            [11200000, '14 kamar terisi'],
            [12000000, '15 kamar terisi'],
            [12800000, '16 kamar terisi'],
            [13600000, '17 kamar terisi'],
            [12800000, '16 kamar terisi'],
        ];

        foreach ($months as $index => $month) {
            [$revenueAmount, $notes] = $patterns[$index];

            RevenueEntry::create([
                'business_id' => $business->id,
                'period_month' => $month->format('Y-m-d'),
                'revenue_amount_idr' => $revenueAmount,
                'revenue_input_mode' => 'EXACT',
                'notes' => $notes,
            ]);
        }
    }

    private function seedAppliances(Business $business): void
    {
        Appliance::where('business_id', $business->id)->delete();

        $appliances = [
            ['AC kamar', 'Pendingin', 450, 1, 8, 30, 'Tergantung ukuran ruangan dan mode pemakaian'],
            ['Kipas angin', 'Pendingin', 50, 1, 10, 30, 'Konsumsi rendah, sering menyala lama'],
            ['Lampu kamar', 'Penerangan', 12, 1, 10, 30, 'LED atau bohlam biasa berbeda daya'],
            ['Lampu koridor', 'Penerangan', 15, 2, 12, 30, 'Biasanya menyala lebih lama'],
            ['Pompa air', 'Utilitas', 250, 1, 3, 30, 'Pemakaian tergantung jumlah penghuni'],
            ['Dispenser', 'Dapur', 350, 1, 8, 30, 'Daya tergantung fitur panas/dingin'],
            ['Kulkas', 'Dapur', 100, 1, 24, 30, 'Menyala terus-menerus'],
            ['Router WiFi', 'Utilitas', 15, 1, 24, 30, 'Menyala terus-menerus'],
            ['CCTV', 'Keamanan', 15, 1, 24, 30, 'Menyala terus-menerus'],
            ['Mesin cuci bersama', 'Laundry', 400, 1, 3, 15, 'Pemakaian bersama, tidak setiap hari'],
        ];

        foreach ($appliances as [$name, $category, $watt, $quantity, $hours, $days, $notes]) {
            Appliance::create([
                'business_id' => $business->id,
                'name' => $name,
                'category' => $category,
                'watt' => $watt,
                'quantity' => $quantity,
                'hours_per_day' => $hours,
                'days_per_month' => $days,
                'source' => 'TEMPLATE',
                'confidence' => 'COMMON_MARKET_RANGE',
                'notes' => $notes,
            ]);
        }
    }
}
