<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Business;
use App\Models\BusinessProfile;
use App\Models\ElectricityProfile;
use App\Models\Subscription;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class WattWiseDemoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * WARNING: Do NOT run this seeder on a production environment.
     * This is strictly for local development and staging smoke tests.
     */
    public function run(): void
    {
        // 1. Create or Update Demo User
        $user = User::updateOrCreate(
            ['email' => 'demo@wattwise.local'],
            [
                'name' => 'Demo WattWise',
                'password' => Hash::make('password'),
            ]
        );

        // 2. Create or Update Business
        $business = Business::updateOrCreate(
            [
                'user_id' => $user->id,
                'name' => 'Kos Melati Purwokerto',
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

        // 5. Create or Update Subscription
        Subscription::updateOrCreate(
            ['user_id' => $user->id],
            [
                'plan' => 'FREE',
                'status' => 'ACTIVE',
            ]
        );
    }
}
