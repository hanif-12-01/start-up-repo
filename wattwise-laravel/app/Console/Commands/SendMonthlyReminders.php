<?php

namespace App\Console\Commands;

use App\Contracts\WhatsAppGateway;
use App\Models\ReminderDelivery;
use App\Services\WhatsApp\MonthlyReminderSelector;
use App\Services\WhatsApp\PhoneNormalizer;
use App\Services\WhatsApp\ReminderMessageBuilder;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;

class SendMonthlyReminders extends Command
{
    /**
     * @var string
     */
    protected $signature = 'wattwise:monthly-reminders
        {--date= : Local date YYYY-MM-DD to evaluate (defaults to today)}
        {--dry-run : Simulate selection without recording or sending}';

    /**
     * @var string
     */
    protected $description = 'Evaluate monthly WhatsApp data-entry reminders (log-only; no real delivery).';

    public function handle(
        MonthlyReminderSelector $selector,
        ReminderMessageBuilder $messageBuilder,
        WhatsAppGateway $gateway,
        PhoneNormalizer $normalizer,
    ): int {
        $date = $this->resolveDate();
        if ($date === null) {
            $this->error('Tanggal tidak valid. Gunakan format YYYY-MM-DD.');

            return self::FAILURE;
        }

        $dryRun = (bool) $this->option('dry-run');
        $remindersEnabled = (bool) config('whatsapp.reminders_enabled');

        // Non-dry execution stays blocked while the feature is disabled by default.
        if (! $dryRun && ! $remindersEnabled) {
            $this->warn('Pengiriman pengingat dinonaktifkan (WHATSAPP_REMINDERS_ENABLED=false). Tidak ada yang diproses.');
            $this->line('Gunakan --dry-run untuk simulasi.');

            return self::SUCCESS;
        }

        $type = (string) config('whatsapp.reminder_type');
        $selection = $selector->select($date);

        $simulated = 0;

        foreach ($selection->eligible as $reminder) {
            $masked = $normalizer->mask($reminder->normalizedPhone) ?? '***';

            if ($dryRun) {
                $simulated++;
                $this->line("[dry-run] {$masked} · {$reminder->period}");

                continue;
            }

            $message = $messageBuilder->monthlyReminder($reminder->recipientName, $reminder->period);
            $result = $gateway->send($reminder->normalizedPhone, $message);

            ReminderDelivery::updateOrCreate(
                [
                    'user_id' => $reminder->user->id,
                    'type' => $type,
                    'period' => $reminder->period,
                ],
                [
                    'notification_preference_id' => $reminder->preference->id,
                    'destination_fingerprint' => $normalizer->fingerprint($reminder->normalizedPhone),
                    'destination_masked' => $masked,
                    'status' => $result->status,
                    'attempted_at' => CarbonImmutable::now(),
                    'delivered_at' => $result->delivered ? CarbonImmutable::now() : null,
                    'failure_code' => $result->failureCode,
                ],
            );

            $simulated++;
            $this->line("[log] {$masked} · {$reminder->period}");
        }

        $this->newLine();
        $this->info('Ringkasan pengingat bulanan WattWise');
        $this->table(
            ['Metrik', 'Jumlah'],
            [
                ['Periode', $selection->period],
                ['Mode', $dryRun ? 'dry-run (simulasi)' : 'log (tanpa pengiriman nyata)'],
                ['Eligible', (string) $selection->eligibleCount()],
                ['Skipped', (string) $selection->skipped],
                ['Duplicate', (string) $selection->duplicates],
                ['Simulated', (string) $simulated],
            ],
        );

        if (! $dryRun) {
            $this->line('Catatan: driver log tidak mengirim pesan WhatsApp nyata.');
        }

        return self::SUCCESS;
    }

    private function resolveDate(): ?CarbonImmutable
    {
        $option = $this->option('date');

        if ($option === null || $option === '') {
            return CarbonImmutable::now();
        }

        try {
            $date = CarbonImmutable::createFromFormat('!Y-m-d', $option);
        } catch (\Throwable) {
            return null;
        }

        // Guard against false and rollover dates (e.g. 2026-02-30).
        if (! $date instanceof CarbonImmutable || $date->format('Y-m-d') !== $option) {
            return null;
        }

        return $date;
    }
}
