<?php

namespace App\Services\Billing;

use RuntimeException;

final class BillingAvailability
{
    /** @var list<string> */
    private const ALLOWED_ENVIRONMENTS = ['local', 'testing', 'staging'];

    public function enabled(): bool
    {
        return config('billing.enabled') === true
            && config('billing.driver') === 'sandbox'
            && config('billing.simulation_only') === true
            && app()->environment(self::ALLOWED_ENVIRONMENTS);
    }

    public function assertEnabled(): void
    {
        if (config('billing.enabled') !== true) {
            throw new RuntimeException('Sandbox billing is disabled.');
        }

        $driver = (string) config('billing.driver', 'disabled');

        if ($driver === 'disabled') {
            throw new RuntimeException('Billing driver is disabled.');
        }

        if ($driver !== 'sandbox') {
            throw UnknownBillingDriverException::for($driver);
        }

        if (config('billing.simulation_only') !== true) {
            throw new RuntimeException('Billing must remain simulation-only.');
        }

        if (! app()->environment(self::ALLOWED_ENVIRONMENTS)) {
            throw new RuntimeException('Sandbox billing is unavailable in this application environment.');
        }
    }
}
