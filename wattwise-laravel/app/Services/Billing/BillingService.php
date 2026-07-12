<?php

namespace App\Services\Billing;

use App\Contracts\BillingProvider;
use App\Models\BillingPlan;
use App\Models\SandboxInvoice;
use App\Models\SandboxPayment;
use App\Models\User;
use App\Models\UserEntitlement;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Orchestrates the simulation-only sandbox checkout: it creates invoices and
 * pending payments, settles them through the {@see BillingProvider} simulator,
 * and grants entitlements only for a successfully simulated payment.
 */
class BillingService
{
    public function __construct(
        private readonly BillingProvider $provider,
    ) {
        // Hard fail-closed guard. This build is simulation-only; a provider
        // that is not simulation-only must never be used.
        if (! config('billing.simulation_only', true) || ! $this->provider->isSimulationOnly()) {
            throw new RuntimeException('Billing is configured for real payments, which is not allowed in this build.');
        }
    }

    /**
     * Begin a sandbox checkout for a paid plan: create an open invoice plus a
     * pending payment. No external provider is contacted.
     */
    public function startCheckout(User $user, BillingPlan $plan): SandboxPayment
    {
        if ($plan->isFree()) {
            throw new RuntimeException('The Free plan does not require checkout; use selectFree().');
        }

        return DB::transaction(function () use ($user, $plan): SandboxPayment {
            $invoice = SandboxInvoice::create([
                'user_id' => $user->id,
                'plan_id' => $plan->id,
                'invoice_number' => $this->generateInvoiceNumber(),
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
     * Simulate a successful payment: mark the payment simulated_paid, the
     * invoice paid, and activate the user's entitlement for the plan.
     */
    public function simulateSuccess(SandboxPayment $payment): SandboxPayment
    {
        $this->assertPending($payment);

        return DB::transaction(function () use ($payment): SandboxPayment {
            $this->provider->settle($payment, true);

            $invoice = $payment->invoice()->lockForUpdate()->first();
            $invoice->status = SandboxInvoice::STATUS_PAID;
            $invoice->paid_at = Carbon::now();
            $invoice->save();

            $this->activateEntitlement($payment->user_id, $invoice->plan);

            return $payment->refresh();
        });
    }

    /**
     * Simulate a failed payment: mark the payment and invoice failed. The
     * entitlement is NEVER upgraded by a failed payment.
     */
    public function simulateFailure(SandboxPayment $payment): SandboxPayment
    {
        $this->assertPending($payment);

        return DB::transaction(function () use ($payment): SandboxPayment {
            $this->provider->settle($payment, false);

            $invoice = $payment->invoice()->lockForUpdate()->first();
            $invoice->status = SandboxInvoice::STATUS_FAILED;
            $invoice->save();

            return $payment->refresh();
        });
    }

    /**
     * Select the Free plan directly (no payment required).
     */
    public function selectFree(User $user): UserEntitlement
    {
        $free = BillingPlan::where('code', BillingPlan::CODE_FREE)->first();

        return UserEntitlement::updateOrCreate(
            ['user_id' => $user->id],
            [
                'plan_id' => $free?->id,
                'status' => UserEntitlement::STATUS_FREE,
                'source' => UserEntitlement::SOURCE_SANDBOX,
                'starts_at' => Carbon::now(),
                'ends_at' => null,
            ],
        );
    }

    /**
     * Cancel the current entitlement and return the user to Free.
     */
    public function cancel(User $user): UserEntitlement
    {
        $free = BillingPlan::where('code', BillingPlan::CODE_FREE)->first();

        return UserEntitlement::updateOrCreate(
            ['user_id' => $user->id],
            [
                'plan_id' => $free?->id,
                'status' => UserEntitlement::STATUS_CANCELLED,
                'source' => UserEntitlement::SOURCE_SANDBOX,
                'ends_at' => Carbon::now(),
            ],
        );
    }

    /**
     * Resolve the plan the user is effectively entitled to right now. Falls
     * back to Free when there is no active paid entitlement.
     */
    public function currentPlan(User $user): BillingPlan
    {
        $entitlement = $user->entitlement;

        if ($entitlement !== null && $entitlement->isActivePaid()) {
            $plan = $entitlement->plan;

            if ($plan !== null) {
                return $plan;
            }
        }

        return BillingPlan::where('code', BillingPlan::CODE_FREE)->firstOrFail();
    }

    /**
     * Grant an active entitlement for a paid plan. Only ever called from a
     * successfully simulated payment path.
     */
    private function activateEntitlement(int $userId, BillingPlan $plan): UserEntitlement
    {
        $starts = Carbon::now();
        $ends = $plan->interval === 'yearly'
            ? $starts->copy()->addYear()
            : $starts->copy()->addMonth();

        return UserEntitlement::updateOrCreate(
            ['user_id' => $userId],
            [
                'plan_id' => $plan->id,
                'status' => UserEntitlement::STATUS_ACTIVE,
                'source' => UserEntitlement::SOURCE_SANDBOX,
                'starts_at' => $starts,
                'ends_at' => $ends,
            ],
        );
    }

    private function assertPending(SandboxPayment $payment): void
    {
        if ($payment->status !== SandboxPayment::STATUS_PENDING) {
            throw new RuntimeException('Only a pending sandbox payment can be simulated.');
        }
    }

    private function generateInvoiceNumber(): string
    {
        do {
            $number = 'SBX-'.Carbon::now()->format('Ymd').'-'.Str::upper(Str::random(8));
        } while (SandboxInvoice::where('invoice_number', $number)->exists());

        return $number;
    }
}
