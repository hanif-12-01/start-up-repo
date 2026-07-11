<?php

namespace App\Services\WhatsApp;

final class MonthlyReminderSelection
{
    /**
     * @param  list<EligibleReminder>  $eligible
     */
    public function __construct(
        public readonly array $eligible,
        public readonly int $skipped,
        public readonly int $duplicates,
        public readonly string $period,
    ) {}

    public function eligibleCount(): int
    {
        return count($this->eligible);
    }
}
