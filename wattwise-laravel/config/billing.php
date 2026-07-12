<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Sandbox Billing (Simulation Only)
    |--------------------------------------------------------------------------
    |
    | DISABLED BY DEFAULT. Enable only for staging/local/testing.
    | Never contacts a real payment provider.
    |
    */

    'enabled' => env('BILLING_ENABLED', false),

    // disabled | sandbox
    'driver' => env('BILLING_DRIVER', 'disabled'),

    // Hard guard: this build is simulation-only.
    'simulation_only' => true,

    'currency' => 'IDR',

    // Map billing_plans.code → FeatureGateService plan identifier.
    'plan_map' => [
        'free' => 'FREE',
        'pro' => 'PRO',
        'business' => 'BUSINESS',
    ],
];
