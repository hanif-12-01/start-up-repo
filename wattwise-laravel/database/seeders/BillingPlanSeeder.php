<?php

namespace Database\Seeders;

use App\Models\BillingPlan;
use Illuminate\Database\Seeder;

class BillingPlanSeeder extends Seeder
{
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
                'code' => BillingPlan::CODE_PRO,
                'name' => 'Pro',
                'price_amount' => 49000,
                'interval' => 'monthly',
                'features' => ['pdf_reports', 'reminders', 'advanced_report_history'],
                'active' => true,
            ],
            [
                'code' => BillingPlan::CODE_BUSINESS,
                'name' => 'Business',
                'price_amount' => 149000,
                'interval' => 'monthly',
                'features' => ['pdf_reports', 'reminders', 'advanced_report_history', 'multi_business'],
                'active' => true,
            ],
        ];

        foreach ($plans as $plan) {
            BillingPlan::updateOrCreate(
                ['code' => $plan['code']],
                $plan + ['currency' => config('billing.currency', 'IDR')],
            );
        }

        // Remove stale Starter plan if it exists from previous seeds.
        BillingPlan::where('code', 'starter')->delete();
    }
}
