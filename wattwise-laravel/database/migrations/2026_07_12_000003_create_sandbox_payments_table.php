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
        Schema::create('sandbox_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('invoice_id')->constrained('sandbox_invoices')->cascadeOnDelete();
            // Only ever the simulation driver in this build.
            $table->string('provider')->default('sandbox_simulator');
            // Simulated provider reference, assigned when a simulation runs.
            $table->string('provider_reference')->nullable()->unique();
            $table->unsignedInteger('amount')->default(0);
            $table->string('currency', 3)->default('IDR');
            // pending | simulated_paid | failed
            $table->string('status')->default('pending');
            // Always true in this simulation-only build.
            $table->boolean('simulated')->default(true);
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sandbox_payments');
    }
};
