<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
| Monthly WhatsApp reminders — disabled by default.
|
| The schedule only evaluates when WHATSAPP_REMINDERS_ENABLED=true. Even when
| enabled, the command uses the safe non-delivering log driver in this scope.
| Railway/host cron activation is a later operational step and is NOT configured
| here. Runs daily at the documented application-local time and never overlaps.
*/
Schedule::command('wattwise:monthly-reminders')
    ->dailyAt((string) config('whatsapp.schedule_time', '08:00'))
    ->timezone((string) config('whatsapp.timezone', 'Asia/Jakarta'))
    ->when(fn (): bool => (bool) config('whatsapp.reminders_enabled'))
    ->withoutOverlapping();
