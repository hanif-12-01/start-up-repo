<?php

namespace App\Services\WhatsApp;

use App\Contracts\WhatsAppGateway;
use Illuminate\Support\Facades\Log;

/**
 * Safe, non-delivering gateway. It never contacts an external network and
 * never delivers a real message. Destinations are masked in logs and message
 * content is never logged (it may reference a business name).
 */
class LogWhatsAppGateway implements WhatsAppGateway
{
    public function __construct(
        private readonly PhoneNormalizer $normalizer,
    ) {}

    public function send(string $destination, string $message): WhatsAppResult
    {
        Log::info('WhatsApp reminder recorded via log driver (no external delivery).', [
            'destination' => $this->normalizer->mask($destination),
            'message_length' => strlen($message),
        ]);

        return WhatsAppResult::logged();
    }
}
