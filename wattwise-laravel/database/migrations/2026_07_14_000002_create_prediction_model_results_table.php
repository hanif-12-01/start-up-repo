<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('prediction_model_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('prediction_run_id')->constrained('prediction_runs')->cascadeOnDelete();
            $table->string('model_key', 50);
            $table->string('model_version', 50);
            $table->string('execution_mode', 30);
            $table->string('status', 20);
            $table->decimal('predicted_usage_kwh', 14, 4)->nullable();
            $table->decimal('predicted_bill_idr', 16, 2)->nullable();
            $table->json('feature_snapshot')->nullable();
            $table->string('artifact_sha256', 64)->nullable();
            $table->decimal('duration_ms', 10, 3)->nullable();
            $table->string('skip_reason', 50)->nullable();
            $table->string('failure_code', 50)->nullable();
            $table->timestamp('generated_at');
            $table->timestamps();

            $table->unique(['prediction_run_id', 'model_key', 'model_version']);
            $table->index('model_key');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prediction_model_results');
    }
};
