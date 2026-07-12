<?php

use Illuminate\Database\Migrations\Migration;

/**
 * The user_entitlements table was removed during the PR #9 hardening.
 * Subscription is the single source of truth for plan state.
 * This migration is intentionally a no-op to avoid renumbering.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Removed: user_entitlements table is not used.
    }

    public function down(): void
    {
        // No-op.
    }
};
