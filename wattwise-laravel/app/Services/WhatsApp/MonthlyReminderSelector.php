<?php

namespace App\Services\WhatsApp;

use App\Models\NotificationPreference;
use App\Models\ReminderDelivery;
use Carbon\CarbonInterface;

/**
 * Deterministically selects users eligible for a monthly reminder on a given
 * local date. A user is eligible only when reminders are enabled, an explicit
 * opt-in exists, a valid normalized number exists, the reminder day matches the
 * supplied date, they own at least one active (non-archived) business, and no
 * blocking delivery exists for the same reminder type and period.
 */
class MonthlyReminderSelector
{
    public function __construct(
        private readonly PhoneNormalizer $normalizer,
    ) {}

    public function select(CarbonInterface $date): MonthlyReminderSelection
    {
        $day = (int) $date->format('j');
        $period = $date->format('Y-m');
        $type = (string) config('whatsapp.reminder_type');

        $candidates = NotificationPreference::query()
            ->where('whatsapp_enabled', true)
            ->whereNotNull('whatsapp_opted_in_at')
            ->where('monthly_reminder_day', $day)
            ->with('user')
            ->orderBy('user_id')
            ->get();

        /** @var list<EligibleReminder> $eligible */
        $eligible = [];
        $skipped = 0;
        $duplicates = 0;

        foreach ($candidates as $preference) {
            $user = $preference->user;

            $phone = $this->normalizer->normalize($preference->whatsapp_phone);
            if ($phone === null) {
                $skipped++;

                continue;
            }

            // Resolve the eligible active business server-side. Archived
            // businesses never qualify.
            $activeBusiness = $user->businesses()->active()->orderBy('id')->first();
            if ($activeBusiness === null) {
                $skipped++;

                continue;
            }

            $alreadyProcessed = ReminderDelivery::query()
                ->where('user_id', $user->id)
                ->where('type', $type)
                ->where('period', $period)
                ->whereIn('status', ReminderDelivery::BLOCKING_STATUSES)
                ->exists();

            if ($alreadyProcessed) {
                $duplicates++;

                continue;
            }

            $eligible[] = new EligibleReminder(
                preference: $preference,
                user: $user,
                normalizedPhone: $phone,
                recipientName: $activeBusiness->name !== '' ? $activeBusiness->name : $user->name,
                period: $period,
            );
        }

        return new MonthlyReminderSelection($eligible, $skipped, $duplicates, $period);
    }
}
