<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('prediction_runs', function (Blueprint $table) {
            $table->string('request_id', 64)->nullable()->unique();
            $table->foreignId('source_entry_id')
                ->nullable()
                ->constrained('electricity_entries')
                ->nullOnDelete();
            $table->string('reporting_phase', 10)->nullable();
            $table->string('selected_model', 50)->nullable();
            $table->string('selected_model_version', 100)->nullable();
            $table->string('prediction_mode', 20)->nullable();
            $table->string('phase_status', 30)->nullable();
            $table->decimal('prediction_output_kwh', 14, 4)->nullable();
            $table->decimal('deterministic_fallback_kwh', 14, 4)->nullable();
            $table->string('eligibility_status', 20)->nullable();
            $table->string('fallback_reason', 100)->nullable();
            $table->decimal('inference_latency_ms', 10, 3)->nullable();
            $table->string('artifact_identifier', 255)->nullable();
            $table->string('artifact_sha256', 64)->nullable();
            $table->string('error_category', 50)->nullable();
            $table->json('inference_warnings')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('prediction_runs', function (Blueprint $table) {
            $table->dropForeign(['source_entry_id']);
            $table->dropUnique(['request_id']);
            $table->dropColumn([
                'request_id', 'source_entry_id', 'reporting_phase', 'selected_model',
                'selected_model_version', 'prediction_mode', 'phase_status',
                'prediction_output_kwh', 'deterministic_fallback_kwh',
                'eligibility_status', 'fallback_reason', 'inference_latency_ms',
                'artifact_identifier', 'artifact_sha256', 'error_category',
                'inference_warnings',
            ]);
        });
    }
};
