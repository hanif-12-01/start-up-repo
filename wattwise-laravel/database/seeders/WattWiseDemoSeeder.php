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

        // Preserve the original single-business demo unless the dedicated ML
        // validation flag is enabled. This keeps existing smoke-test behaviour
        // stable while allowing one account to expand into five phase cases.
        $scenarioKeys = ['h06_12'];
        if (DemoAccount::mlValidationEnabled()) {
            $scenarioKeys = array_merge(
                ['h06_12'],
                array_values(array_diff(array_keys(DemoAccount::ML_SCENARIOS), ['h06_12'])),
            );
        }

        foreach ($scenarioKeys as $scenarioKey) {
            $scenario = DemoAccount::ML_SCENARIOS[$scenarioKey];
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

        if (DemoAccount::portfolioDemoEnabled()) {
            $this->seedMultiLocationPortfolio($user);
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
                    'ml_validation_scenarios' => DemoAccount::mlValidationEnabled()
                        ? array_keys(DemoAccount::ML_SCENARIOS)
                        : ['h06_12'],
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
     * @param  Carbon[]  $months
     * @param  array<string, mixed>  $scenario
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
     * @param  Carbon[]  $months
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

    /**
     * Seed 3 additional realistic locations to demonstrate multi-location
     * portfolio command center (IT-P0-09) during competition demo:
     * - Laundry Berkah Purwokerto (Laundry, spike +22% / Perlu Perhatian)
     * - Kedai Kopi Soedirman (F&B, increase +14% / Perlu Dicek)
     * - Toko Frozen Jaya (Cold storage, missing current month / Data Belum Lengkap)
     * (Kos Melati Purwokerto represents Normal / Aman).
     */
    private function seedMultiLocationPortfolio(User $user): void
    {
        $months6 = $this->computeDemoMonths(6);
        $tariff = 1444.70;

        // 1. Laundry Berkah Purwokerto (Perlu Perhatian: +22% spike in current month)
        $laundry = Business::updateOrCreate(
            ['user_id' => $user->id, 'name' => 'Laundry Berkah Purwokerto'],
            [
                'business_type' => 'LAUNDRY',
                'city' => 'Banyumas',
                'province' => 'Jawa Tengah',
                'status' => Business::STATUS_ACTIVE,
                'onboarding_completed_at' => now(),
            ]
        );
        BusinessProfile::updateOrCreate(
            ['business_id' => $laundry->id],
            ['employee_count' => 3, 'operating_days_per_month' => 30, 'notes' => 'Outlet laundry kiloan & satuan']
        );
        ElectricityProfile::updateOrCreate(
            ['business_id' => $laundry->id],
            ['customer_type' => 'Bisnis/Industri', 'power_va' => 5500, 'tariff_per_kwh' => $tariff, 'payment_method' => 'Pascabayar']
        );

        ElectricityEntry::where('business_id', $laundry->id)->delete();
        $laundryUsages = [1180.0, 1210.0, 1195.0, 1205.0, 1210.0, 1464.0];
        $meter = 35000.0;
        foreach ($months6 as $i => $m) {
            $u = $laundryUsages[$i];
            ElectricityEntry::create([
                'business_id' => $laundry->id,
                'period_month' => $m->format('Y-m-d'),
                'usage_kwh' => $u,
                'bill_amount_idr' => round($u * $tariff, 2),
                'meter_start' => $meter,
                'meter_end' => $meter + $u,
                'tariff_per_kwh' => $tariff,
                'payment_method' => 'Pascabayar',
                'notes' => 'Data sintetis demo portfolio multi-lokasi.',
            ]);
            $meter += $u;
        }

        RevenueEntry::where('business_id', $laundry->id)->delete();
        $laundryRevenues = [17500000, 17800000, 18000000, 18200000, 18200000, 18500000];
        foreach ($months6 as $i => $m) {
            RevenueEntry::create([
                'business_id' => $laundry->id,
                'period_month' => $m->format('Y-m-d'),
                'revenue_amount_idr' => $laundryRevenues[$i],
                'revenue_input_mode' => 'EXACT',
                'notes' => 'Penerimaan operasional laundry',
            ]);
        }

        // 2. Kedai Kopi Soedirman (Perlu Dicek: +14% increase in current month)
        $fnb = Business::updateOrCreate(
            ['user_id' => $user->id, 'name' => 'Kedai Kopi Soedirman'],
            [
                'business_type' => 'FNB',
                'city' => 'Purwokerto',
                'province' => 'Jawa Tengah',
                'status' => Business::STATUS_ACTIVE,
                'onboarding_completed_at' => now(),
            ]
        );
        BusinessProfile::updateOrCreate(
            ['business_id' => $fnb->id],
            ['employee_count' => 5, 'operating_days_per_month' => 30, 'notes' => 'Kedai kopi dan makanan ringan']
        );
        ElectricityProfile::updateOrCreate(
            ['business_id' => $fnb->id],
            ['customer_type' => 'Bisnis/Usaha', 'power_va' => 3500, 'tariff_per_kwh' => $tariff, 'payment_method' => 'Pascabayar']
        );

        ElectricityEntry::where('business_id', $fnb->id)->delete();
        $fnbUsages = [840.0, 855.0, 845.0, 860.0, 850.0, 969.0];
        $meterFnb = 22000.0;
        foreach ($months6 as $i => $m) {
            $u = $fnbUsages[$i];
            ElectricityEntry::create([
                'business_id' => $fnb->id,
                'period_month' => $m->format('Y-m-d'),
                'usage_kwh' => $u,
                'bill_amount_idr' => round($u * $tariff, 2),
                'meter_start' => $meterFnb,
                'meter_end' => $meterFnb + $u,
                'tariff_per_kwh' => $tariff,
                'payment_method' => 'Pascabayar',
                'notes' => 'Data sintetis demo portfolio multi-lokasi.',
            ]);
            $meterFnb += $u;
        }

        RevenueEntry::where('business_id', $fnb->id)->delete();
        $fnbRevenues = [22000000, 22500000, 23000000, 23500000, 23500000, 24000000];
        foreach ($months6 as $i => $m) {
            RevenueEntry::create([
                'business_id' => $fnb->id,
                'period_month' => $m->format('Y-m-d'),
                'revenue_amount_idr' => $fnbRevenues[$i],
                'revenue_input_mode' => 'EXACT',
                'notes' => 'Omzet penjualan coffee shop',
            ]);
        }

        // 3. Toko Frozen Jaya (Data Belum Lengkap: missing current month electricity)
        $frozen = Business::updateOrCreate(
            ['user_id' => $user->id, 'name' => 'Toko Frozen Jaya'],
            [
                'business_type' => 'COLD_STORAGE',
                'city' => 'Purwokerto',
                'province' => 'Jawa Tengah',
                'status' => Business::STATUS_ACTIVE,
                'onboarding_completed_at' => now(),
            ]
        );
        BusinessProfile::updateOrCreate(
            ['business_id' => $frozen->id],
            ['employee_count' => 4, 'operating_days_per_month' => 30, 'notes' => 'Distributor makanan beku']
        );
        ElectricityProfile::updateOrCreate(
            ['business_id' => $frozen->id],
            ['customer_type' => 'Bisnis/Industri', 'power_va' => 7700, 'tariff_per_kwh' => $tariff, 'payment_method' => 'Pascabayar']
        );

        ElectricityEntry::where('business_id', $frozen->id)->delete();
        $frozenUsages = [1820.0, 1850.0, 1840.0, 1860.0, 1850.0];
        $meterFrozen = 51000.0;
        for ($i = 0; $i < 5; $i++) {
            $m = $months6[$i];
            $u = $frozenUsages[$i];
            ElectricityEntry::create([
                'business_id' => $frozen->id,
                'period_month' => $m->format('Y-m-d'),
                'usage_kwh' => $u,
                'bill_amount_idr' => round($u * $tariff, 2),
                'meter_start' => $meterFrozen,
                'meter_end' => $meterFrozen + $u,
                'tariff_per_kwh' => $tariff,
                'payment_method' => 'Pascabayar',
                'notes' => 'Data sintetis demo portfolio multi-lokasi.',
            ]);
            $meterFrozen += $u;
        }

        RevenueEntry::where('business_id', $frozen->id)->delete();
        $frozenRevenues = [32000000, 33000000, 34000000, 34500000, 35000000];
        for ($i = 0; $i < 5; $i++) {
            RevenueEntry::create([
                'business_id' => $frozen->id,
                'period_month' => $months6[$i]->format('Y-m-d'),
                'revenue_amount_idr' => $frozenRevenues[$i],
                'revenue_input_mode' => 'EXACT',
                'notes' => 'Omzet toko frozen food',
            ]);
        }
    }
}
