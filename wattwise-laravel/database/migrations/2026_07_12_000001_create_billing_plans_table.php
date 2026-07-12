<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('billing_plans', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            // Whole-rupiah amount (IDR has no minor unit). 0 for the Free plan.
            $table->unsignedInteger('price_amount')->default(0);
            $table->string('currency', 3)->default('IDR');
            // Billing cadence: monthly or yearly.
            $table->string('interval')->default('monthly');
            $table->json('features')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        $now = now();
        DB::table('billing_plans')->insert([
            [
                'code' => 'free',
                'name' => 'Free',
                'price_amount' => 0,
                'currency' => 'IDR',
                'interval' => 'monthly',
                'features' => json_encode(['basic_access'], JSON_THROW_ON_ERROR),
                'active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'code' => 'pro',
                'name' => 'Pro',
                'price_amount' => 49000,
                'currency' => 'IDR',
                'interval' => 'monthly',
                'features' => json_encode(['pdf_reports', 'reminders', 'advanced_report_history'], JSON_THROW_ON_ERROR),
                'active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'code' => 'business',
                'name' => 'Business',
                'price_amount' => 149000,
                'currency' => 'IDR',
                'interval' => 'monthly',
                'features' => json_encode(['pdf_reports', 'reminders', 'advanced_report_history', 'multi_business'], JSON_THROW_ON_ERROR),
                'active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('billing_plans');
    }
};
