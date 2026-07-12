<?php

namespace App\Services\Billing;

use RuntimeException;

/**
 * Thrown when `config('billing.driver')` names a driver that is not the
 * simulation-only sandbox simulator. Billing fails closed: it never falls back
 * to a real payment provider.
 */
class UnknownBillingDriverException extends RuntimeException
{
    public static function for(string $driver): self
    {
        return new self(sprintf(
            'Unknown billing driver [%s]. Only the simulation-only "sandbox_simulator" driver is supported; refusing to fall back to a real provider.',
            $driver,
        ));
    }
}
