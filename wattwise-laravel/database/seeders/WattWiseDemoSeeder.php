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

        // 1. Create or Update Demo User
        $user = User::updateOrCreate(
            ['email' => DemoAccount::EMAIL],
            [
                'name' => DemoAccount::USER_NAME,
                'password' => Hash::make(DemoAccount::PASSWORD),
            ]
        );

        // Ensure the demo account is fully login-ready: mark the email as
        // verified so login still works if email verification is enforced
        // later. email_verified_at is not mass-assignable, so set it directly.
        if (is_null($user->email_verified_at)) {
            $user->forceFill(['email_verified_at' => now()])->save();
        }

        if (is_null($user->initial_plan_selected_at)) {
            $user->initial_plan_selected_at = \Illuminate\Support\Carbon::now();
            $user->save();
        }

        // 2. Create or Update Business
        $business = Business::updateOrCreate(
            [
                'user_id' => $user->id,
                'name' => DemoAccount::BUSINESS_NAME,
            ],
            [
                'business_type' => 'KOS_PROPERTY',
                'city' => 'Purwokerto',
                'province' => 'Jawa Tengah',
                'status' => 'ACTIVE',
                'onboarding_completed_at' => now(),
            ]
        );

        // 3. Create or Update Business Profile
        BusinessProfile::updateOrCreate(
            ['business_id' => $business->id],
            [
                'room_count' => 20,
                'occupied_room_count' => 16,
                'employee_count' => 2,
                'operating_days_per_month' => 30,
            ]
        );

        // 4. Create or Update Electricity Profile
        ElectricityProfile::updateOrCreate(
            ['business_id' => $business->id],
            [
                'customer_type' => 'Bisnis/Rumah Tangga',
                'power_va' => 2200,
                'tariff_per_kwh' => 1444.70,
                'payment_method' => 'Pascabayar',
            ]
        );

        // 5. Create or Update Subscription (PRO_TRIAL for demo)
        //    This allows the demo to showcase 6 months of data without
        //    hitting FREE plan limits (max 3 entries).
        //    This is local/demo seed data only — not a real paid subscription.
        Subscription::updateOrCreate(
            ['user_id' => $user->id],
            [
                'plan' => DemoAccount::SUBSCRIPTION_PLAN,
                'status' => 'ACTIVE',
                'trial_starts_at' => now(),
                'trial_ends_at' => now()->addDays(30),
                'current_period_starts_at' => now(),
                'current_period_ends_at' => now()->addDays(30),
                'metadata' => ['source' => 'demo_seed', 'note' => 'Local demo data only'],
            ]
        );

        // 6. Compute 6 demo months ending at the current month.
        //    This ensures the dashboard always has data for "this month".
        //    The newest month is now()->startOfMonth(); the 5 preceding
        //    months are consecutive before it.
        $demoMonths = $this->computeDemoMonths();

        // 7. Seed Electricity Entries (6 months, deterministic)
        //    Tariff: Rp 1.444,70/kWh (matching electricity profile)
        //    bill_amount_idr = usage_kwh × tariff_per_kwh (rounded)
        //    meter_start/meter_end simulate cumulative meter readings
        $this->seedElectricityEntries($business, $demoMonths);

        // 8. Seed Revenue Entries (6 months, deterministic)
        $this->seedRevenueEntries($business, $demoMonths);

        // 9. Seed Appliances (10 items, KOS_PROPERTY template values)
        $this->seedAppliances($business);
    }

    /**
     * Compute 6 consecutive demo months ending at the current month.
     *
     * Returns an array of 6 Carbon dates (first day of each month),
     * ordered oldest to newest. The newest is now()->startOfMonth().
     *
     * @return Carbon[]
     */
    private function computeDemoMonths(): array
    {
        $current = now()->startOfMonth();
        $months = [];

        for ($i = 5; $i >= 0; $i--) {
            $months[] = Carbon::instance($current->copy()->subMonths($i));
        }

        return $months;
    }

    /**
     * Seed 6 months of deterministic electricity entries.
     *
     * Months are dynamic (ending at current month) so the dashboard
     * always has meaningful data. Values are deterministic per position.
     *
     * @param  Carbon[]  $months
     */
    private function seedElectricityEntries(Business $business, array $months): void
    {
        // Delete existing electricity entries for this demo business only.
        // This ensures idempotency: re-running the seeder replaces
        // demo entries without duplicating them.
        // Scoped strictly to $business->id — never touches other businesses.
        ElectricityEntry::where('business_id', $business->id)->delete();

        $tariff = 1444.70;

        // Cumulative meter base — arbitrary starting value
        $meterBase = 45200.00;

        // Deterministic values ordered oldest to newest
        $patterns = [
            // [usage_kwh, notes]
            [780, 'Pemakaian rendah awal periode'],
            [820, 'Pemakaian normal'],
            [860, 'Pemakaian meningkat'],
            [910, 'Pemakaian tinggi musiman'],
            [940, 'Puncak pemakaian'],
            [875, 'Pemakaian menurun kembali'],
        ];

        $cumulativeKwh = 0;

        foreach ($months as $i => $month) {
            [$usageKwh, $notes] = $patterns[$i];
            $meterStart = $meterBase + $cumulativeKwh;
            $meterEnd = $meterStart + $usageKwh;
            $billAmount = round($usageKwh * $tariff, 2);

            ElectricityEntry::create([
                'business_id' => $business->id,
                'period_month' => $month->format('Y-m-d'),
                'usage_kwh' => $usageKwh,
                'bill_amount_idr' => $billAmount,
                'meter_start' => $meterStart,
                'meter_end' => $meterEnd,
                'tariff_per_kwh' => $tariff,
                'payment_method' => 'Pascabayar',
                'notes' => $notes,
            ]);

            $cumulativeKwh += $usageKwh;
        }
    }

    /**
     * Seed 6 months of deterministic revenue entries.
     *
     * Revenue = occupied_rooms × sewa_per_kamar (Rp 800.000/kamar).
     * Variation reflects seasonal occupancy changes.
     *
     * @param  Carbon[]  $months
     */
    private function seedRevenueEntries(Business $business, array $months): void
    {
        // Delete existing revenue entries for this demo business only.
        // Same idempotency strategy as electricity entries and appliances.
        RevenueEntry::where('business_id', $business->id)->delete();

        // Deterministic values ordered oldest to newest
        $patterns = [
            // [revenue_amount_idr, notes]
            [10400000, '13 kamar terisi'],
            [11200000, '14 kamar terisi'],
            [12000000, '15 kamar terisi'],
            [12800000, '16 kamar terisi'],
            [13600000, '17 kamar terisi'],
            [12800000, '16 kamar terisi'],
        ];

        foreach ($months as $i => $month) {
            [$revenueAmount, $notes] = $patterns[$i];
            RevenueEntry::create([
                'business_id' => $business->id,
                'period_month' => $month->format('Y-m-d'),
                'revenue_amount_idr' => $revenueAmount,
                'revenue_input_mode' => 'EXACT',
                'notes' => $notes,
            ]);
        }
    }

    /**
     * Seed 10 realistic KOS_PROPERTY appliances.
     *
     * Values match ApplianceTemplates::kosProperty() defaults.
     * Uses delete-and-recreate strategy scoped only to the demo business
     * to ensure idempotency without needing unique appliance keys.
     *
     * "Daya alat bisa berbeda tergantung merk, seri, usia alat, dan cara pemakaian."
     */
    private function seedAppliances(Business $business): void
    {
        // Delete existing appliances for this demo business only.
        // This ensures idempotency: re-running the seeder replaces
        // demo appliances without duplicating them.
        // Scoped strictly to $business->id — never touches other businesses.
        Appliance::where('business_id', $business->id)->delete();

        $appliances = [
            // [name, category, watt, qty, hours_per_day, days_per_month, notes]
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

        foreach ($appliances as [$name, $category, $watt, $qty, $hours, $days, $notes]) {
            Appliance::create([
                'business_id' => $business->id,
                'name' => $name,
                'category' => $category,
                'watt' => $watt,
                'quantity' => $qty,
                'hours_per_day' => $hours,
                'days_per_month' => $days,
                'source' => 'TEMPLATE',
                'confidence' => 'COMMON_MARKET_RANGE',
                'notes' => $notes,
            ]);
        }
    }
}
