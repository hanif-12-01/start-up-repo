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
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->timestamp('trial_starts_at')->nullable()->after('status');
            $table->timestamp('current_period_starts_at')->nullable()->after('trial_ends_at');
            $table->timestamp('canceled_at')->nullable()->after('current_period_ends_at');
            $table->json('metadata')->nullable()->after('canceled_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropColumn([
                'trial_starts_at',
                'current_period_starts_at',
                'canceled_at',
                'metadata',
            ]);
        });
    }
};
