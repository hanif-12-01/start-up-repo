<?php

namespace App\Services\Billing;

use App\Contracts\BillingProvider;
use App\Models\BillingPlan;
use App\Models\SandboxInvoice;
use App\Models\SandboxPayment;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class BillingService
{
    public function __construct(
        private readonly BillingProvider $provider,
    ) {
        if (! config('billing.simulation_only', true) || ! $this->provider->isSimulationOnly()) {
            throw new RuntimeException('Billing is configured for real payments, which is not allowed in this build.');
        }
    }

    /**
     * Start checkout with idempotency: one active pending checkout per user+plan.
     */
    public function startCheckout(User $user, BillingPlan $plan, string $idempotencyKey): SandboxPayment
    {
        if ($plan->isFree()) {
            throw new RuntimeException('The Free plan does not require checkout; use selectFree().');
        }

        return DB::transaction(function () use ($user, $plan, $idempotencyKey): SandboxPayment {
            $existing = SandboxInvoice::where('idempotency_key', $idempotencyKey)
                ->where('user_id', $user->id)
                ->first();

            if ($existing !== null) {
                $pendingPayment = $existing->payments()
                    ->where('status', SandboxPayment::STATUS_PENDING)
                    ->first();

                if ($pendingPayment !== null) {
                    return $pendingPayment;
                }
            }

            $invoice = SandboxInvoice::create([
                'user_id' => $user->id,
                'plan_id' => $plan->id,
                'invoice_number' => $this->generateInvoiceNumber(),
                'idempotency_key' => $idempotencyKey,
                'amount' => $plan->price_amount,
                'currency' => $plan->currency,
                'status' => SandboxInvoice::STATUS_OPEN,
                'simulated' => true,
                'issued_at' => Carbon::now(),
            ]);

            return SandboxPayment::create([
                'user_id' => $user->id,
                'invoice_id' => $invoice->id,
                'provider' => $this->provider->identifier(),
                'amount' => $invoice->amount,
                'currency' => $invoice->currency,
                'status' => SandboxPayment::STATUS_PENDING,
                'simulated' => true,
            ]);
        });
    }

    /**
     * Simulate success: mark paid, activate subscription via the canonical
     * Subscription model. Idempotent: replayed success returns the same result.
     */
    public function simulateSuccess(SandboxPayment $payment): SandboxPayment
    {
        return DB::transaction(function () use ($payment): SandboxPayment {
            /** @var SandboxPayment $payment */
            $payment = SandboxPayment::lockForUpdate()->findOrFail($payment->id);

            if ($payment->status === SandboxPayment::STATUS_SIMULATED_PAID) {
                return $payment;
            }

            if ($payment->status !== SandboxPayment::STATUS_PENDING) {
                throw new RuntimeException('Cannot succeed a '.$payment->status.' payment.');
            }

            /** @var SandboxInvoice $invoice */
            $invoice = SandboxInvoice::lockForUpdate()->findOrFail($payment->invoice_id);

            if ($invoice->user_id !== $payment->user_id) {
                throw new RuntimeException('Payment/invoice ownership mismatch.');
            }

            if ($invoice->amount !== $payment->amount || $invoice->currency !== $payment->currency) {
                throw new RuntimeException('Payment amount/currency mismatch.');
            }

            $this->provider->settle($payment, true);

            $invoice->status = SandboxInvoice::STATUS_PAID;
            $invoice->paid_at = Carbon::now();
            $invoice->save();

            $plan = $invoice->plan;
            $this->activateSubscription($payment->user_id, $plan);

            return $payment->refresh();
        });
    }

    /**
     * Simulate failure. Idempotent: replayed failure returns the same result.
     */
    public function simulateFailure(SandboxPayment $payment): SandboxPayment
    {
        return DB::transaction(function () use ($payment): SandboxPayment {
            /** @var SandboxPayment $payment */
            $payment = SandboxPayment::lockForUpdate()->findOrFail($payment->id);

            if ($payment->status === SandboxPayment::STATUS_FAILED) {
                return $payment;
            }

            if ($payment->status !== SandboxPayment::STATUS_PENDING) {
                throw new RuntimeException('Cannot fail a '.$payment->status.' payment.');
            }

            $this->provider->settle($payment, false);

            /** @var SandboxInvoice $invoice */
            $invoice = SandboxInvoice::lockForUpdate()->findOrFail($payment->invoice_id);
            $invoice->status = SandboxInvoice::STATUS_FAILED;
            $invoice->save();

            return $payment->refresh();
        });
    }

    /**
     * Cancel a pending payment. Never changes the subscription.
     */
    public function simulateCancellation(SandboxPayment $payment): SandboxPayment
    {
        return DB::transaction(function () use ($payment): SandboxPayment {
            /** @var SandboxPayment $payment */
            $payment = SandboxPayment::lockForUpdate()->findOrFail($payment->id);

            if ($payment->status === SandboxPayment::STATUS_CANCELLED) {
                return $payment;
            }

            if ($payment->status !== SandboxPayment::STATUS_PENDING) {
                throw new RuntimeException('Cannot cancel a '.$payment->status.' payment.');
            }

            $payment->status = SandboxPayment::STATUS_CANCELLED;
            $payment->simulated = true;
            $payment->metadata = array_merge($payment->metadata ?? [], [
                'simulated' => true,
                'cancelled_at' => Carbon::now()->toIso8601String(),
                'outcome' => 'cancelled',
            ]);
            $payment->save();

            /** @var SandboxInvoice $invoice */
            $invoice = SandboxInvoice::lockForUpdate()->findOrFail($payment->invoice_id);
            $invoice->status = SandboxInvoice::STATUS_CANCELLED;
            $invoice->save();

            return $payment->refresh();
        });
    }

    /**
     * Cancel the subscription and return to Free.
     */
    public function cancelSubscription(User $user): void
    {
        $subscription = $user->subscription;
        if ($subscription === null) {
            return;
        }

        $subscription->update([
            'plan' => 'FREE',
            'status' => 'ACTIVE',
            'canceled_at' => Carbon::now(),
            'metadata' => array_merge($subscription->metadata ?? [], [
                'source' => 'sandbox',
                'sandbox_cancelled_at' => Carbon::now()->toIso8601String(),
            ]),
        ]);
    }

    /**
     * Activate subscription using the canonical Subscription model (single source of truth).
     */
    private function activateSubscription(int $userId, BillingPlan $plan): void
    {
        $gatePlan = $plan->featureGatePlan();
        $now = Carbon::now();
        $periodEnd = $plan->interval === 'yearly'
            ? $now->copy()->addYear()
            : $now->copy()->addMonth();

        Subscription::updateOrCreate(
            ['user_id' => $userId],
            [
                'plan' => $gatePlan,
                'status' => 'ACTIVE',
                'current_period_starts_at' => $now,
                'current_period_ends_at' => $periodEnd,
                'canceled_at' => null,
                'metadata' => [
                    'source' => 'sandbox',
                    'simulated' => true,
                    'billing_plan_code' => $plan->code,
                ],
            ],
        );
    }

    private function generateInvoiceNumber(): string
    {
        do {
            $number = 'SBX-'.Carbon::now()->format('Ymd').'-'.Str::upper(Str::random(8));
        } while (SandboxInvoice::where('invoice_number', $number)->exists());

        return $number;
    }
}
