<?php

namespace App\Services\WhatsApp;

/**
 * Normalizes and masks Indonesian WhatsApp numbers. Deterministic, dependency
 * free. Accepts the common local formats and only ever returns a valid
 * Indonesian mobile number in E.164 form (+62...) or null.
 */
class PhoneNormalizer
{
    /**
     * Normalize a raw user-entered Indonesian mobile number to E.164 (+62...).
     * Returns null for anything that is not a plausible Indonesian mobile.
     *
     * Accepted inputs: 081234567890, 6281234567890, +6281234567890,
     * optionally with spaces, hyphens, dots, or parentheses.
     */
    public function normalize(?string $raw): ?string
    {
        if ($raw === null) {
            return null;
        }

        $trimmed = trim($raw);
        if ($trimmed === '') {
            return null;
        }

        // Drop common separators only; anything else invalidates the input.
        $cleaned = preg_replace('/[\s\-().]/', '', $trimmed) ?? '';

        // Must be digits with at most a single leading '+' (rejects letters).
        if (preg_match('/^\+?\d+$/', $cleaned) !== 1) {
            return null;
        }

        $digits = ltrim($cleaned, '+');

        // Normalize the trunk/country prefix to the national "62..." form.
        if (str_starts_with($digits, '0')) {
            $national = '62'.substr($digits, 1);
        } elseif (str_starts_with($digits, '62')) {
            $national = $digits;
        } else {
            // Not an Indonesian trunk (0) or country (62) prefix — reject
            // rather than silently converting an arbitrary international number.
            return null;
        }

        // Indonesian mobile numbers: 62 + 8 + 8..11 more digits.
        if (preg_match('/^628\d{8,11}$/', $national) !== 1) {
            return null;
        }

        return '+'.$national;
    }

    /**
     * Mask a normalized E.164 number for display/logging, e.g. +62812*****890.
     * Never returns the full number.
     */
    public function mask(?string $e164): ?string
    {
        if ($e164 === null || strlen($e164) < 9) {
            return null;
        }

        return substr($e164, 0, 6).'*****'.substr($e164, -3);
    }

    /**
     * Non-reversible, keyed fingerprint of a normalized number. Uses an HMAC
     * keyed by the application key (read from config, never env) so the digest
     * cannot be pre-computed from a public rainbow table.
     *
     * This is NOT the idempotency key (that stays user/type/period), so a key
     * rotation changing future fingerprints is acceptable.
     */
    public function fingerprint(string $e164): string
    {
        return hash_hmac('sha256', $e164, (string) config('app.key'));
    }
}
