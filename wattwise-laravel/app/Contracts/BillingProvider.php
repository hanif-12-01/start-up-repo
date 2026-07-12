<?php

namespace App\Contracts;

use App\Models\SandboxPayment;

/**
 * A billing provider settles sandbox payments. The only implementation in this
 * build is the simulation-only sandbox simulator: implementations must NEVER
 * contact a real payment network, collect card data, or send real invoices.
 */
interface BillingProvider
{
    /**
     * Stable identifier stored on payments (e.g. "sandbox_simulator").
     */
    public function identifier(): string;

    /**
     * Whether this provider is simulation-only. Must be true in this build.
     */
    public function isSimulationOnly(): bool;

    /**
     * Settle a pending payment by simulation. When $shouldSucceed is true the
     * payment becomes `simulated_paid`; otherwise it becomes `failed`. This
     * assigns a simulated provider reference and performs NO external calls.
     */
    public function settle(SandboxPayment $payment, bool $shouldSucceed): SandboxPayment;
}
