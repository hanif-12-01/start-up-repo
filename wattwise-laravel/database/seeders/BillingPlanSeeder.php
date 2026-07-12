<?php

namespace Database\Seeders;

use App\Models\BillingPlan;
use Illuminate\Database\Seeder;

class BillingPlanSeeder extends Seeder
{
    /**
     * Seed the three purchasable sandbox plans. Prices are whole-rupiah (IDR).
     */
    public function run(): void
    {
        $plans = [
            [
                'code' => BillingPlan::CODE_FREE,
                'name' => 'Free',
                'price_amount' => 0,
                'interval' => 'monthly',
                'features' => ['basic_access'],
                'active' => true,
            ],
            [
                'code' => BillingPlan::CODE_STARTER,
                'name' => 'Starter',
                'price_amount' => 49000,
                'interval' => 'monthly',
                'features' => ['pdf_reports', 'reminder_foundation_access'],
                'active' => true,
            ],
            [
                'code' => BillingPlan::CODE_PRO,
                'name' => 'Pro',
                'price_amount' => 99000,
                'interval' => 'monthly',
                'features' => ['pdf_reports', 'reminders', 'advanced_report_history'],
                'active' => true,
            ],
        ];

        foreach ($plans as $plan) {
            BillingPlan::updateOrCreate(
                ['code' => $plan['code']],
                $plan + ['currency' => config('billing.currency', 'IDR')],
            );
        }
    }
}
