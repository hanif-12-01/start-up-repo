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
        Schema::create('sandbox_invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('plan_id')->constrained('billing_plans')->cascadeOnDelete();
            $table->string('invoice_number')->unique();
            // Whole-rupiah amount owed for this invoice.
            $table->unsignedInteger('amount')->default(0);
            $table->string('currency', 3)->default('IDR');
            // draft | open | paid | void | failed
            $table->string('status')->default('draft');
            // Always true in this simulation-only build.
            $table->boolean('simulated')->default(true);
            $table->timestamp('issued_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sandbox_invoices');
    }
};
