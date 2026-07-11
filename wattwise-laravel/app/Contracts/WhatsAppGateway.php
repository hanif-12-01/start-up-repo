<?php

namespace App\Contracts;

use App\Services\WhatsApp\WhatsAppResult;

interface WhatsAppGateway
{
    /**
     * Attempt to deliver a message to a normalized E.164 destination.
     *
     * Implementations must never expose the full destination in logs and must
     * return a typed result rather than throwing on ordinary delivery outcomes.
     */
    public function send(string $destination, string $message): WhatsAppResult;
}
