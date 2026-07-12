<?php

namespace App\Http\Controllers;

use App\Models\BillingPlan;
use App\Models\SandboxPayment;
use App\Services\Billing\BillingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Sandbox (simulation-only) billing. No route here contacts a real payment
 * provider, collects card data, or exposes any secret.
 */
class BillingController extends Controller
{
    public function __construct(
        private readonly BillingService $billingService,
    ) {}

    /**
     * Billing overview: current plan, available plans, and the sandbox warning.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $current = $this->billingService->currentPlan($user);
        $entitlement = $user->entitlement;

        $plans = BillingPlan::where('active', true)
            ->orderBy('price_amount')
            ->get()
            ->map(fn (BillingPlan $plan): array => $this->presentPlan($plan))
            ->all();

        return Inertia::render('Billing/Index', [
            'sandbox' => true,
            'currency' => config('billing.currency', 'IDR'),
            'currentPlan' => [
                'code' => $current->code,
                'name' => $current->name,
            ],
            'entitlement' => $entitlement === null ? null : [
                'status' => $entitlement->status,
                'ends_at' => $entitlement->ends_at?->toIso8601String(),
            ],
            'plans' => $plans,
        ]);
    }

    /**
     * Start a sandbox checkout for the selected plan. Free is applied directly;
     * paid plans create an invoice + pending payment and redirect to the
     * simulation page.
     */
    public function checkout(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'plan_code' => ['required', 'string', 'exists:billing_plans,code'],
        ]);

        $user = $request->user();
        $plan = BillingPlan::where('code', $validated['plan_code'])
            ->where('active', true)
            ->firstOrFail();

        if ($plan->isFree()) {
            $this->billingService->selectFree($user);
            Inertia::flash('toast', ['type' => 'success', 'message' => 'Anda kini menggunakan paket Free (Sandbox).']);

            return redirect()->route('billing.index');
        }

        $payment = $this->billingService->startCheckout($user, $plan);

        return redirect()->route('billing.payment.show', ['payment' => $payment->id]);
    }

    /**
     * Show the payment simulation page for a pending payment.
     */
    public function show(Request $request, SandboxPayment $payment): Response|RedirectResponse
    {
        $this->authorizePayment($request, $payment);

        $payment->load('invoice.plan');
        $invoice = $payment->invoice;

        // Already settled: nothing to simulate, send the user back to billing.
        if ($payment->status !== SandboxPayment::STATUS_PENDING) {
            return redirect()->route('billing.index');
        }

        return Inertia::render('Billing/Checkout', [
            'sandbox' => true,
            'currency' => $payment->currency,
            'payment' => [
                'id' => $payment->id,
                'status' => $payment->status,
                'amount' => $payment->amount,
                'provider' => $payment->provider,
                'simulated' => $payment->simulated,
            ],
            'invoice' => [
                'invoice_number' => $invoice->invoice_number,
                'amount' => $invoice->amount,
                'status' => $invoice->status,
                'simulated' => $invoice->simulated,
            ],
            'plan' => [
                'code' => $invoice->plan->code,
                'name' => $invoice->plan->name,
            ],
        ]);
    }

    /**
     * Simulate the payment outcome (success or failure).
     */
    public function simulate(Request $request, SandboxPayment $payment): RedirectResponse
    {
        $this->authorizePayment($request, $payment);

        $validated = $request->validate([
            'outcome' => ['required', 'string', 'in:success,failure'],
        ]);

        if ($payment->status !== SandboxPayment::STATUS_PENDING) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Pembayaran ini sudah diproses.']);

            return redirect()->route('billing.index');
        }

        if ($validated['outcome'] === 'success') {
            $this->billingService->simulateSuccess($payment);
            Inertia::flash('toast', ['type' => 'success', 'message' => 'Pembayaran simulasi berhasil. Paket Anda telah diaktifkan (Sandbox).']);
        } else {
            $this->billingService->simulateFailure($payment);
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Pembayaran simulasi gagal. Paket Anda tidak diubah.']);
        }

        return redirect()->route('billing.index');
    }

    /**
     * Cancel the current entitlement and return to Free.
     */
    public function cancel(Request $request): RedirectResponse
    {
        $this->billingService->cancel($request->user());
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Langganan sandbox dibatalkan. Anda kembali ke paket Free.']);

        return redirect()->route('billing.index');
    }

    /**
     * @return array<string, mixed>
     */
    private function presentPlan(BillingPlan $plan): array
    {
        return [
            'code' => $plan->code,
            'name' => $plan->name,
            'price_amount' => $plan->price_amount,
            'currency' => $plan->currency,
            'interval' => $plan->interval,
            'features' => $plan->features ?? [],
            'is_free' => $plan->isFree(),
        ];
    }

    /**
     * Ensure the payment belongs to the acting user. Logs and 404s otherwise so
     * a payment id cannot be probed across accounts.
     */
    private function authorizePayment(Request $request, SandboxPayment $payment): void
    {
        if ($payment->user_id !== $request->user()->id) {
            Log::warning('Blocked cross-account sandbox payment access.', [
                'payment_id' => $payment->id,
                'actor_id' => $request->user()->id,
            ]);
            abort(404);
        }
    }
}
