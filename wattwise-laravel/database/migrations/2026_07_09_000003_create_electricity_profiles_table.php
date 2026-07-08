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
        Schema::create('electricity_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->unique()->constrained('businesses')->onDelete('cascade');
            $table->string('customer_type')->nullable();
            $table->integer('power_va')->nullable();
            $table->decimal('tariff_per_kwh', 12, 2)->nullable();
            $table->string('payment_method')->nullable();
            $table->string('meter_type')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('electricity_profiles');
    }
};
