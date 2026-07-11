<?php

namespace App\Services\WhatsApp;

use App\Models\NotificationPreference;
use App\Models\User;

/**
 * A single resolved, eligible monthly reminder. The eligible business is
 * resolved server-side — never from external request input.
 */
final class EligibleReminder
{
    public function __construct(
        public readonly NotificationPreference $preference,
        public readonly User $user,
        public readonly string $normalizedPhone,
        public readonly string $recipientName,
        public readonly string $period,
    ) {}
}
