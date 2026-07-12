<?php

namespace App\Services\Billing;

use App\Contracts\BillingProvider;
use App\Models\SandboxPayment;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Simulation-only billing provider. It settles payments by flipping a status
 * and assigning a fabricated reference. It NEVER opens a socket, calls an HTTP
 * API, collects card data, or contacts Stripe/Midtrans/Xendit/PayPal.
 */
class SandboxSimulatorProvider implements BillingProvider
{
    public const IDENTIFIER = 'sandbox_simulator';

    public function identifier(): string
    {
        return self::IDENTIFIER;
    }

    public function isSimulationOnly(): bool
    {
        return true;
    }

    public function settle(SandboxPayment $payment, bool $shouldSucceed): SandboxPayment
    {
        // Fabricated, clearly-simulated reference. No provider is contacted.
        $reference = 'SIM-'.Str::upper(Str::random(16));

        $payment->provider = self::IDENTIFIER;
        $payment->provider_reference = $reference;
        $payment->simulated = true;
        $payment->status = $shouldSucceed
            ? SandboxPayment::STATUS_SIMULATED_PAID
            : SandboxPayment::STATUS_FAILED;
        $payment->metadata = array_merge($payment->metadata ?? [], [
            'simulated' => true,
            'simulator' => self::IDENTIFIER,
            'settled_at' => Carbon::now()->toIso8601String(),
            'outcome' => $shouldSucceed ? 'success' : 'failure',
        ]);
        $payment->save();

        Log::info('Sandbox payment settled by simulator (no external network call).', [
            'payment_id' => $payment->id,
            'status' => $payment->status,
            'simulated' => true,
        ]);

        return $payment;
    }
}
