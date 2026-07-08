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
        Schema::create('revenue_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained('businesses')->onDelete('cascade');
            $table->date('period_month');
            $table->decimal('revenue_amount_idr', 14, 2)->nullable();
            $table->string('revenue_input_mode')->default('EXACT');
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
        Schema::dropIfExists('revenue_entries');
    }
};
