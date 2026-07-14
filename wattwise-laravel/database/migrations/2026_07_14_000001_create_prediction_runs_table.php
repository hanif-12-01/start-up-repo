<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('prediction_runs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            $table->string('target_period', 7);
            $table->string('input_fingerprint', 64);
            $table->string('trigger_source', 50);
            $table->unsignedTinyInteger('history_months');
            $table->string('history_bucket', 10);
            $table->string('business_type_snapshot', 50);
            $table->decimal('tariff_snapshot', 12, 2)->nullable();
            $table->timestamp('generated_at');
            $table->timestamps();

            $table->unique(['business_id', 'target_period', 'input_fingerprint']);
            $table->index(['business_id', 'target_period']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prediction_runs');
    }
};
