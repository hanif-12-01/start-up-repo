<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('prediction_evaluations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('prediction_model_result_id')->constrained('prediction_model_results')->cascadeOnDelete();
            $table->decimal('actual_usage_kwh', 14, 4);
            $table->decimal('signed_error_kwh', 14, 4);
            $table->decimal('absolute_error_kwh', 14, 4);
            $table->decimal('squared_error_kwh', 20, 4);
            $table->decimal('absolute_percentage_error', 10, 6)->nullable();
            $table->timestamp('evaluated_at');
            $table->timestamps();

            $table->unique('prediction_model_result_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prediction_evaluations');
    }
};
