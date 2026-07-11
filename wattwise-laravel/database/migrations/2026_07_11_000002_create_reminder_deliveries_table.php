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
        Schema::create('reminder_deliveries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('notification_preference_id')->constrained()->cascadeOnDelete();
            $table->string('type');
            // 'YYYY-MM' period the reminder covers.
            $table->string('period');
            // Non-reversible hash of the normalized destination (never plaintext).
            $table->string('destination_fingerprint');
            // Human-readable masked destination, e.g. +62812*****890.
            $table->string('destination_masked')->nullable();
            $table->string('status');
            $table->timestamp('attempted_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->string('failure_code')->nullable();
            $table->timestamps();

            // Idempotency: one delivery per user + reminder type + period.
            $table->unique(['user_id', 'type', 'period']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reminder_deliveries');
    }
};
