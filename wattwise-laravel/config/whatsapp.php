<?php

return [

    /*
    |--------------------------------------------------------------------------
    | WhatsApp Monthly Reminders (Phase 2 Foundation)
    |--------------------------------------------------------------------------
    |
    | Provider-neutral foundation. No real provider is connected in this scope.
    | The feature is disabled by default: when `reminders_enabled` is false the
    | scheduled evaluation is skipped and the console command performs no
    | non-dry processing.
    |
    */

    // Master switch. Must stay false until a real service channel is connected.
    'reminders_enabled' => env('WHATSAPP_REMINDERS_ENABLED', false),

    // Only the safe, non-delivering "log" driver exists in this scope.
    'driver' => env('WHATSAPP_DRIVER', 'log'),

    // Documented application-local time for the daily scheduler evaluation.
    'schedule_time' => env('WHATSAPP_SCHEDULE_TIME', '08:00'),

    // The application timezone is UTC (see config/app.php), so reminder
    // scheduling and per-user defaults use a safe Indonesian fallback.
    'timezone' => env('WHATSAPP_TIMEZONE', 'Asia/Jakarta'),

    // Reminder type identifier used for idempotency records.
    'reminder_type' => 'monthly_data_entry',
];
