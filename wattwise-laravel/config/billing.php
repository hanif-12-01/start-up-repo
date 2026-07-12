<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Sandbox Billing (Simulation Only)
    |--------------------------------------------------------------------------
    |
    | This is a STAGING-SAFE, SIMULATION-ONLY billing system. It never contacts
    | a real payment provider (Stripe, Midtrans, Xendit, PayPal, ...), never
    | collects card data, and never sends real invoices. Every invoice and
    | payment it creates is marked `simulated = true`.
    |
    | The only supported driver is `sandbox_simulator`. Any unknown driver must
    | FAIL CLOSED (throw) rather than silently fall back to a real provider.
    |
    */

    // The active billing driver. Only `sandbox_simulator` is supported; unknown
    // values fail closed in App\Providers\AppServiceProvider.
    'driver' => env('BILLING_DRIVER', 'sandbox_simulator'),

    // The canonical simulation driver identifier. Used to reject any attempt to
    // configure a non-simulation provider.
    'simulator_driver' => 'sandbox_simulator',

    // Hard guard: this build is simulation-only. It is intentionally not
    // overridable by env so a staging misconfiguration cannot enable real
    // payments. If this is ever false the billing service refuses to operate.
    'simulation_only' => true,

    // Default fiat currency for plans, invoices, and payments.
    'currency' => 'IDR',
];
