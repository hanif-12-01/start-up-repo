<?php

return [
    'enabled' => (bool) env('DEMO_LOGIN_ENABLED', false),

    'phase_accounts' => [
        'enabled' => (bool) env('DEMO_PHASE_ACCOUNTS_ENABLED', false),
        'password' => env('DEMO_PHASE_ACCOUNTS_PASSWORD'),
    ],
];
