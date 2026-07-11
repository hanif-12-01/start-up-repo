<?php

namespace App\Services\WhatsApp;

use App\Models\ReminderDelivery;

/**
 * Typed outcome of a gateway send attempt. `delivered` is true only for a real
 * provider delivery — the log driver is explicitly NOT a delivery.
 */
final class WhatsAppResult
{
    public function __construct(
        public readonly bool $delivered,
        public readonly string $status,
        public readonly ?string $failureCode = null,
    ) {}

    /**
     * The log driver ran: recorded, but nothing was sent to WhatsApp.
     */
    public static function logged(): self
    {
        return new self(false, ReminderDelivery::STATUS_LOGGED);
    }

    public static function failed(string $failureCode): self
    {
        return new self(false, ReminderDelivery::STATUS_FAILED, $failureCode);
    }
}
