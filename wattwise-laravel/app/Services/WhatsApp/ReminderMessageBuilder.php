<?php

namespace App\Services\WhatsApp;

/**
 * Builds the monthly data-entry reminder message. The message never exposes
 * revenue, electricity costs, account identifiers, or internal IDs, and never
 * implies real-time measurement or official PLN affiliation.
 */
class ReminderMessageBuilder
{
    /** @var array<int, string> */
    private const MONTHS = [
        1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
        5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
        9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember',
    ];

    /**
     * @param  string  $recipientName  User or active-business name (already safe).
     * @param  string  $period  'YYYY-MM' target month.
     */
    public function monthlyReminder(string $recipientName, string $period): string
    {
        $name = $this->safeName($recipientName);
        $monthLabel = $this->monthLabel($period);

        $message = "Halo {$name}, saatnya melengkapi catatan listrik dan pendapatan WattWise untuk {$monthLabel}. "
            .'Data yang lengkap membantu laporan dan rekomendasi tetap relevan berdasarkan data yang Anda input.';

        $link = $this->safeLink();
        if ($link !== null) {
            $message .= " Buka WattWise: {$link}";
        }

        $message .= ' WattWise bukan aplikasi resmi PLN dan tidak mengukur pemakaian secara real-time.';

        return $message;
    }

    private function safeName(string $recipientName): string
    {
        $name = trim(preg_replace('/\s+/', ' ', $recipientName) ?? '');

        return $name !== '' ? $name : 'Pengguna WattWise';
    }

    private function monthLabel(string $period): string
    {
        if (preg_match('/^(\d{4})-(\d{2})$/', $period, $m) === 1) {
            $month = (int) $m[2];
            if (isset(self::MONTHS[$month])) {
                return self::MONTHS[$month].' '.$m[1];
            }
        }

        return 'bulan ini';
    }

    /**
     * Build a dashboard link only when APP_URL is a safe http(s) URL.
     */
    private function safeLink(): ?string
    {
        $appUrl = config('app.url');
        if (! is_string($appUrl) || $appUrl === '') {
            return null;
        }

        $scheme = parse_url($appUrl, PHP_URL_SCHEME);
        if (! in_array($scheme, ['http', 'https'], true)) {
            return null;
        }

        return rtrim($appUrl, '/').'/dashboard';
    }
}
