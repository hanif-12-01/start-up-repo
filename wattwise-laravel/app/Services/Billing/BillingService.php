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
        BillingAvailability $billingAvailability,
    ) {
        $billingAvailability->assertEnabled();

        if (! $this->provider->isSimulationOnly()) {
            throw new RuntimeException('Billing is configured for real payments, which is not allowed in this build.');
        }
    }

    /**
     * Atomically return the one checkout attempt scoped by user, plan, and key.
     */
    public function startCheckout(User $user, BillingPlan $plan, string $idempotencyKey): SandboxPayment
    {
        if ($plan->isFree()) {
            throw new RuntimeException('The Free plan does not require checkout; use selectFree().');
        }

        if (! $plan->active) {
            throw new RuntimeException('Inactive billing plans cannot be checked out.');
        }

        $plan->featureGatePlan();

        return DB::transaction(function () use ($user, $plan, $idempotencyKey): SandboxPayment {
            $invoice = SandboxInvoice::query()->createOrFirst(
                [
                    'user_id' => $user->id,
                    'plan_id' => $plan->id,
                    'idempotency_key' => $idempotencyKey,
                ],
                fn (): array => [
                    'invoice_number' => $this->generateInvoiceNumber(),
                    'amount' => $plan->price_amount,
                    'currency' => $plan->currency,
                    'status' => SandboxInvoice::STATUS_OPEN,
                    'simulated' => true,
                    'issued_at' => Carbon::now(),
                ],
            );

            /** @var SandboxInvoice $invoice */
            $invoice = SandboxInvoice::query()->lockForUpdate()->findOrFail($invoice->id);

            SandboxPayment::query()->createOrFirst(
                ['invoice_id' => $invoice->id],
                [
                    'user_id' => $user->id,
                    'provider' => $this->provider->identifier(),
                    'amount' => $invoice->amount,
                    'currency' => $invoice->currency,
                    'status' => SandboxPayment::STATUS_PENDING,
                    'simulated' => true,
                ],
            );

            /** @var SandboxPayment $payment */
            $payment = SandboxPayment::query()
                ->where('invoice_id', $invoice->id)
                ->lockForUpdate()
                ->firstOrFail();

            $this->assertAttemptInvariants($payment, $invoice, $plan);

            return $payment;
        }, 3);
    }

    public function simulateSuccess(SandboxPayment $payment): SandboxPayment
    {
        return DB::transaction(function () use ($payment): SandboxPayment {
            [$payment, $invoice, $plan] = $this->lockAndValidateAttempt($payment->id);

            if ($payment->status === SandboxPayment::STATUS_SIMULATED_PAID) {
                return $payment;
            }

            $this->assertLegalTransition($payment, SandboxPayment::STATUS_SIMULATED_PAID);
            $this->provider->settle($payment, true);

            $invoice->forceFill([
                'status' => SandboxInvoice::STATUS_PAID,
                'paid_at' => Carbon::now(),
            ])->save();

            $this->activateSubscription($payment, $invoice, $plan);

            return $payment->refresh();
        }, 3);
    }

    public function simulateFailure(SandboxPayment $payment): SandboxPayment
    {
        return DB::transaction(function () use ($payment): SandboxPayment {
            [$payment, $invoice] = $this->lockAndValidateAttempt($payment->id);

            if ($payment->status === SandboxPayment::STATUS_FAILED) {
                return $payment;
            }

            $this->assertLegalTransition($payment, SandboxPayment::STATUS_FAILED);
            $this->provider->settle($payment, false);
            $invoice->forceFill(['status' => SandboxInvoice::STATUS_FAILED])->save();

            return $payment->refresh();
        }, 3);
    }

    public function simulateCancellation(SandboxPayment $payment): SandboxPayment
    {
        return DB::transaction(function () use ($payment): SandboxPayment {
            [$payment, $invoice] = $this->lockAndValidateAttempt($payment->id);

            if ($payment->status === SandboxPayment::STATUS_CANCELLED) {
                return $payment;
            }

            $this->assertLegalTransition($payment, SandboxPayment::STATUS_CANCELLED);

            $payment->forceFill([
                'status' => SandboxPayment::STATUS_CANCELLED,
                'simulated' => true,
                'metadata' => array_merge($payment->metadata ?? [], [
                    'simulated' => true,
                    'cancelled_at' => Carbon::now()->toIso8601String(),
                    'outcome' => 'cancelled',
                ]),
            ])->save();

            $invoice->forceFill(['status' => SandboxInvoice::STATUS_CANCELLED])->save();

            return $payment->refresh();
        }, 3);
    }

    public function cancelSubscription(User $user): void
    {
        DB::transaction(function () use ($user): void {
            /** @var Subscription|null $subscription */
            $subscription = Subscription::query()
                ->where('user_id', $user->id)
                ->lockForUpdate()
                ->first();

            if ($subscription === null) {
                return;
            }

            $now = Carbon::now();
            $subscription->forceFill([
                'plan' => 'FREE',
                'status' => 'ACTIVE',
                'trial_starts_at' => null,
                'trial_ends_at' => null,
                'current_period_starts_at' => null,
                'current_period_ends_at' => null,
                'canceled_at' => $now,
                'metadata' => array_merge($subscription->metadata ?? [], [
                    'source' => 'sandbox',
                    'sandbox_cancellation' => true,
                    'sandbox_cancelled_at' => $now->toIso8601String(),
                ]),
            ])->save();
        }, 3);
    }

    /**
     * @return array{SandboxPayment, SandboxInvoice, BillingPlan}
     */
    private function lockAndValidateAttempt(int $paymentId): array
    {
        /** @var SandboxPayment $payment */
        $payment = SandboxPayment::query()->lockForUpdate()->findOrFail($paymentId);
        /** @var SandboxInvoice $invoice */
        $invoice = SandboxInvoice::query()->lockForUpdate()->findOrFail($payment->invoice_id);
        /** @var BillingPlan|null $plan */
        $plan = BillingPlan::query()->lockForUpdate()->find($invoice->plan_id);

        if ($plan === null) {
            throw new RuntimeException('The invoice billing plan no longer exists.');
        }

        $this->assertAttemptInvariants($payment, $invoice, $plan);

        return [$payment, $invoice, $plan];
    }

    private function assertAttemptInvariants(
        SandboxPayment $payment,
        SandboxInvoice $invoice,
        BillingPlan $plan,
    ): void {
        if (! $payment->simulated || ! $invoice->simulated) {
            throw new RuntimeException('Only simulated billing attempts may be processed.');
        }

        if ($payment->provider !== $this->provider->identifier()) {
            throw new RuntimeException('Payment provider does not match the configured sandbox provider.');
        }

        if ($payment->user_id !== $invoice->user_id) {
            throw new RuntimeException('Payment/invoice ownership mismatch.');
        }

        if ($payment->amount !== $invoice->amount || $payment->currency !== $invoice->currency) {
            throw new RuntimeException('Payment amount/currency mismatch.');
        }

        if ($invoice->amount !== $plan->price_amount || $invoice->currency !== $plan->currency) {
            throw new RuntimeException('Invoice price/currency does not match its server-side plan.');
        }

        if (! $plan->active) {
            throw new RuntimeException('The invoice billing plan is inactive.');
        }

        $plan->featureGatePlan();
    }

    private function assertLegalTransition(SandboxPayment $payment, string $target): void
    {
        if ($payment->status !== SandboxPayment::STATUS_PENDING) {
            throw new RuntimeException('Cannot transition a '.$payment->status.' payment to '.$target.'.');
        }
    }

    private function activateSubscription(
        SandboxPayment $payment,
        SandboxInvoice $invoice,
        BillingPlan $plan,
    ): void {
        $now = Carbon::now();
        $periodEnd = $plan->interval === 'yearly'
            ? $now->copy()->addYear()
            : $now->copy()->addMonth();

        Subscription::query()->createOrFirst(
            ['user_id' => $payment->user_id],
            ['plan' => 'FREE', 'status' => 'ACTIVE'],
        );

        /** @var Subscription $subscription */
        $subscription = Subscription::query()
            ->where('user_id', $payment->user_id)
            ->lockForUpdate()
            ->firstOrFail();

        $subscription->forceFill([
            'plan' => $plan->featureGatePlan(),
            'status' => 'ACTIVE',
            'trial_starts_at' => null,
            'trial_ends_at' => null,
            'current_period_starts_at' => $now,
            'current_period_ends_at' => $periodEnd,
            'canceled_at' => null,
            'metadata' => array_merge($subscription->metadata ?? [], [
                'source' => 'sandbox',
                'simulated' => true,
                'invoice_identifier' => $invoice->invoice_number,
                'payment_identifier' => $payment->id,
                'provider_reference' => $payment->provider_reference,
                'billing_plan_code' => $plan->code,
            ]),
        ])->save();
    }

    private function generateInvoiceNumber(): string
    {
        do {
            $number = 'SBX-'.Carbon::now()->format('Ymd').'-'.Str::upper(Str::random(8));
        } while (SandboxInvoice::where('invoice_number', $number)->exists());

        return $number;
    }
}
