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
        Schema::create('appliances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained('businesses')->onDelete('cascade');
            $table->string('name');
            $table->string('category')->nullable();
            $table->decimal('watt', 12, 2)->nullable();
            $table->unsignedInteger('quantity')->default(1);
            $table->decimal('hours_per_day', 5, 2)->nullable();
            $table->unsignedInteger('days_per_month')->nullable();
            $table->string('source')->default('MANUAL');
            $table->string('confidence')->default('USER_CUSTOM');
            $table->text('notes')->nullable();
            $table->timestamps();

            // Indexes
            $table->index('business_id');
            $table->index('category');
            $table->index('source');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('appliances');
    }
};
