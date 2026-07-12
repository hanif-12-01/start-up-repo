<?php

namespace App\Http\Controllers;

use App\Models\BillingPlan;
use App\Models\SandboxPayment;
use App\Services\Billing\BillingService;
use App\Services\FeatureGateService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class BillingController extends Controller
{
    public function __construct(
        private readonly BillingService $billingService,
        private readonly FeatureGateService $featureGateService,
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $effectivePlan = $this->featureGateService->getEffectivePlan($user);

        $plans = BillingPlan::where('active', true)
            ->orderBy('price_amount')
            ->get()
            ->map(fn (BillingPlan $plan): array => $this->presentPlan($plan))
            ->all();

        return Inertia::render('Billing/Index', [
            'sandbox' => true,
            'currency' => config('billing.currency', 'IDR'),
            'effectivePlan' => $effectivePlan,
            'plans' => $plans,
        ]);
    }

    public function checkout(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'plan_code' => ['required', 'string', 'exists:billing_plans,code'],
            'idempotency_key' => ['sometimes', 'string', 'max:64'],
        ]);

        $user = $request->user();
        $plan = BillingPlan::where('code', $validated['plan_code'])
            ->where('active', true)
            ->firstOrFail();

        $idempotencyKey = $validated['idempotency_key']
            ?? $user->id.'-'.$plan->code.'-'.Str::random(16);

        if ($plan->isFree()) {
            $this->billingService->cancelSubscription($user);
            Inertia::flash('toast', ['type' => 'success', 'message' => 'Anda kini menggunakan paket Free.']);

            return redirect()->route('billing.index');
        }

        $payment = $this->billingService->startCheckout($user, $plan, $idempotencyKey);

        return redirect()->route('billing.payment.show', ['payment' => $payment->id]);
    }

    public function show(Request $request, SandboxPayment $payment): Response|RedirectResponse
    {
        $this->authorizePayment($request, $payment);
        $payment->load('invoice.plan');
        $invoice = $payment->invoice;

        if ($payment->isTerminal()) {
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

    public function simulate(Request $request, SandboxPayment $payment): RedirectResponse
    {
        $this->authorizePayment($request, $payment);

        $validated = $request->validate([
            'outcome' => ['required', 'string', 'in:success,failure,cancelled'],
        ]);

        if ($payment->isTerminal()) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Pembayaran ini sudah diproses.']);

            return redirect()->route('billing.index');
        }

        match ($validated['outcome']) {
            'success' => $this->handleSuccess($payment),
            'failure' => $this->handleFailure($payment),
            'cancelled' => $this->handleCancellation($payment),
            default => abort(422),
        };

        return redirect()->route('billing.index');
    }

    public function cancel(Request $request): RedirectResponse
    {
        $this->billingService->cancelSubscription($request->user());
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Langganan sandbox dibatalkan. Anda kembali ke paket Free.']);

        return redirect()->route('billing.index');
    }

    private function handleSuccess(SandboxPayment $payment): void
    {
        $this->billingService->simulateSuccess($payment);
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pembayaran simulasi berhasil. Paket Anda telah diaktifkan (Sandbox).']);
    }

    private function handleFailure(SandboxPayment $payment): void
    {
        $this->billingService->simulateFailure($payment);
        Inertia::flash('toast', ['type' => 'error', 'message' => 'Pembayaran simulasi gagal. Paket Anda tidak diubah.']);
    }

    private function handleCancellation(SandboxPayment $payment): void
    {
        $this->billingService->simulateCancellation($payment);
        Inertia::flash('toast', ['type' => 'info', 'message' => 'Pembayaran dibatalkan. Paket Anda tidak diubah.']);
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
