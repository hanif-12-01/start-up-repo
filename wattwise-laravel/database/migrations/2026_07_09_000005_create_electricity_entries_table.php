<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('electricity_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained('businesses')->onDelete('cascade');
            $table->date('period_month');
            $table->decimal('usage_kwh', 12, 2)->nullable();
            $table->decimal('bill_amount_idr', 14, 2)->nullable();
            $table->decimal('meter_start', 14, 2)->nullable();
            $table->decimal('meter_end', 14, 2)->nullable();
            $table->decimal('tariff_per_kwh', 12, 2)->nullable();
            $table->string('payment_method')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['business_id', 'period_month']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('electricity_entries');
    }
};
