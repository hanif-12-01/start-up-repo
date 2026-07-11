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
        Schema::create('notification_preferences', function (Blueprint $table) {
            $table->id();
            // One preference row per user; cascade delete with the user.
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            // Stored as ciphertext (Laravel encrypted cast) — never indexed.
            $table->text('whatsapp_phone')->nullable();
            $table->boolean('whatsapp_enabled')->default(false);
            $table->timestamp('whatsapp_opted_in_at')->nullable();
            // UI restricts this to 1..28; enforced again in validation.
            $table->unsignedTinyInteger('monthly_reminder_day')->nullable();
            $table->string('timezone')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notification_preferences');
    }
};
