<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sandbox_invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('plan_id')->constrained('billing_plans')->cascadeOnDelete();
            $table->string('invoice_number')->unique();
            $table->string('idempotency_key', 64);
            $table->unsignedInteger('amount')->default(0);
            $table->string('currency', 3)->default('IDR');
            // draft | open | paid | void | failed | cancelled
            $table->string('status')->default('draft');
            $table->boolean('simulated')->default(true);
            $table->timestamp('issued_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'plan_id', 'idempotency_key']);
            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sandbox_invoices');
    }
};
