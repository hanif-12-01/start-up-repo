<?php

namespace Tests\Feature;

use App\Contracts\BillingProvider;
use App\Models\BillingPlan;
use App\Models\Business;
use App\Models\ElectricityEntry;
use App\Models\RevenueEntry;
use App\Models\SandboxInvoice;
use App\Models\SandboxPayment;
use App\Models\Subscription;
use App\Models\User;
use App\Services\Billing\BillingService;
use App\Services\Billing\SandboxSimulatorProvider;
use App\Services\Billing\UnknownBillingDriverException;
use App\Services\FeatureGateService;
use Database\Seeders\BillingPlanSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Route;
use RuntimeException;
use Tests\TestCase;

class SandboxBillingTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private FeatureGateService $featureGateService;

    protected function setUp(): void
    {
        parent::setUp();

        Http::preventStrayRequests();
        Http::fake();

        config(['billing.enabled' => true, 'billing.driver' => 'sandbox']);
        app()->forgetInstance(BillingProvider::class);

        $this->seed(BillingPlanSeeder::class);
        $this->user = User::factory()->create();
        $this->featureGateService = app(FeatureGateService::class);
    }

    // === Phase 4: Disabled-by-default gate ===

    public function test_billing_disabled_by_default(): void
    {
        // The raw config default (before setUp overrides) is false.
        config(['billing.enabled' => false, 'billing.driver' => 'disabled']);
        $this->assertFalse(config('billing.enabled'));
        $this->assertSame('disabled', config('billing.driver'));
    }

    public function test_routes_unavailable_when_disabled(): void
    {
        config(['billing.enabled' => false]);

        $this->actingAs($this->user)
            ->post(route('billing.checkout'), ['plan_code' => 'pro'])
            ->assertNotFound();
    }

    public function test_production_hard_refusal_even_when_misconfigured(): void
    {
        $this->withoutMiddleware(PreventRequestForgery::class);
        config(['billing.enabled' => true, 'billing.driver' => 'sandbox']);
        app()->detectEnvironment(fn () => 'production');

        $this->actingAs($this->user)
            ->post(route('billing.checkout'), ['plan_code' => 'pro'])
            ->assertNotFound();
    }

    public function test_local_allowed_when_enabled(): void
    {
        $this->withoutMiddleware(PreventRequestForgery::class);
        app()->detectEnvironment(fn () => 'local');
        config(['billing.enabled' => true, 'billing.driver' => 'sandbox']);

        $this->actingAs($this->user)
            ->post(route('billing.checkout'), ['plan_code' => 'pro'])
            ->assertRedirect();
    }

    public function test_testing_allowed_when_enabled(): void
    {
        app()->detectEnvironment(fn () => 'testing');

        $this->actingAs($this->user)
            ->post(route('billing.checkout'), ['plan_code' => 'pro'])
            ->assertRedirect();
    }

    public function test_staging_allowed_when_enabled(): void
    {
        $this->withoutMiddleware(PreventRequestForgery::class);
        app()->detectEnvironment(fn () => 'staging');

        $this->actingAs($this->user)
            ->post(route('billing.checkout'), ['plan_code' => 'pro'])
            ->assertRedirect();
    }

    public function test_non_allowlisted_environments_fail_closed(): void
    {
        $this->withoutMiddleware(PreventRequestForgery::class);
        foreach (['preview', 'qa', 'development', 'unknown-environment'] as $environment) {
            app()->detectEnvironment(fn () => $environment);

            $this->actingAs($this->user)
                ->post(route('billing.checkout'), ['plan_code' => 'pro'])
                ->assertNotFound();
        }
    }

    public function test_simulation_only_must_be_explicitly_enabled(): void
    {
        config(['billing.simulation_only' => false]);

        $this->actingAs($this->user)
            ->post(route('billing.checkout'), ['plan_code' => 'pro'])
            ->assertNotFound();
    }

    public function test_disabled_driver_returns_404(): void
    {
        config(['billing.enabled' => true, 'billing.driver' => 'disabled']);

        $this->actingAs($this->user)
            ->post(route('billing.checkout'), ['plan_code' => 'pro'])
            ->assertNotFound();
    }

    public function test_sidebar_billing_hidden_when_disabled(): void
    {
        config(['billing.enabled' => false]);

        $this->actingAs($this->user)
            ->get(route('dashboard'))
            ->assertInertia(fn ($page) => $page->where('billingEnabled', false));
    }

    public function test_sidebar_billing_visible_when_enabled(): void
    {
        config(['billing.enabled' => true, 'billing.driver' => 'sandbox']);

        $this->actingAs($this->user)
            ->get(route('dashboard'))
            ->assertInertia(fn ($page) => $page->where('billingEnabled', true));
    }

    public function test_navigation_and_inertia_props_are_hidden_in_refused_environment(): void
    {
        app()->detectEnvironment(fn () => 'preview');

        $this->actingAs($this->user)
            ->get(route('plans.index'))
            ->assertInertia(fn ($page) => $page->where('billingEnabled', false));
    }

    // === Phase 3: Subscription integration ===

    public function test_billing_driver_is_simulation_only(): void
    {
        $provider = app(BillingProvider::class);
        $this->assertInstanceOf(SandboxSimulatorProvider::class, $provider);
        $this->assertTrue($provider->isSimulationOnly());
    }

    public function test_unknown_billing_driver_fails_closed(): void
    {
        config()->set('billing.driver', 'stripe');
        app()->forgetInstance(BillingProvider::class);

        $this->expectException(UnknownBillingDriverException::class);
        app(BillingProvider::class);
    }

    public function test_seeded_plans_match_gate_contract(): void
    {
        $this->assertDatabaseHas('billing_plans', ['code' => 'free', 'price_amount' => 0]);
        $this->assertDatabaseHas('billing_plans', ['code' => 'pro', 'price_amount' => 49000]);
        $this->assertDatabaseHas('billing_plans', ['code' => 'business', 'price_amount' => 149000]);
        $this->assertDatabaseMissing('billing_plans', ['code' => 'starter']);
    }

    public function test_guest_redirected_from_billing(): void
    {
        $this->post(route('billing.checkout'), ['plan_code' => 'pro'])->assertRedirect(route('login'));
    }

    public function test_plans_page_is_the_only_plan_selection_source(): void
    {
        $this->actingAs($this->user)
            ->get(route('plans.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Plans/Index')
                ->where('billingEnabled', true)
                ->has('billingPlans', 3)
                ->where('billingPlans.1.code', 'pro')
                ->where('billingPlans.1.price_amount', 49000)
                ->where('billingPlans.2.code', 'business')
                ->where('billingPlans.2.price_amount', 149000)
            );

        $this->assertFalse(Route::has('billing.index'));
    }

    // === Behavioral proof: FREE → PRO → feature gates change ===

    public function test_free_user_denied_pdf_then_pro_success_unlocks_pdf(): void
    {
        // Step 1: start as FREE
        $plan = $this->featureGateService->getEffectivePlan($this->user);
        $this->assertSame('FREE', $plan['id']);

        // Step 2: reports.pdf denied
        $this->assertFalse($this->featureGateService->can($this->user, 'reports.pdf'));

        // Step 3: simulate PRO success
        $payment = $this->startCheckout('pro');
        $this->actingAs($this->user)
            ->post(route('billing.payment.simulate', $payment), ['outcome' => 'success'])
            ->assertRedirect(route('plans.index'));

        // Step 4: FeatureGateService reports PRO
        $this->user->unsetRelation('subscription');
        $plan = $this->featureGateService->getEffectivePlan($this->user);
        $this->assertSame('PRO', $plan['id']);

        // Step 5: reports.pdf now allowed
        $this->assertTrue($this->featureGateService->can($this->user, 'reports.pdf'));
    }

    public function test_simulated_pro_success_unlocks_the_pdf_route(): void
    {
        config(['pdf_reports.enabled' => true]);
        $business = Business::create([
            'user_id' => $this->user->id,
            'name' => 'Kos Billing QA',
            'business_type' => 'KOS_PROPERTY',
            'status' => Business::STATUS_ACTIVE,
        ]);
        ElectricityEntry::create([
            'business_id' => $business->id,
            'period_month' => '2026-06-01',
            'usage_kwh' => 120,
            'bill_amount_idr' => 180000,
        ]);
        RevenueEntry::create([
            'business_id' => $business->id,
            'period_month' => '2026-06-01',
            'revenue_amount_idr' => 5000000,
            'revenue_input_mode' => 'EXACT',
        ]);

        $pdfRoute = route('reports.pdf', ['business' => $business, 'month' => '2026-06']);
        $this->actingAs($this->user)->get($pdfRoute)->assertForbidden();

        $payment = $this->startCheckout('pro');
        app(BillingService::class)->simulateSuccess($payment);
        $this->user->unsetRelation('subscription');

        $response = $this->actingAs($this->user)->get($pdfRoute);
        $response->assertOk()->assertHeader('Content-Type', 'application/pdf');
        $this->assertStringStartsWith('%PDF', (string) $response->getContent());
    }

    public function test_failure_leaves_plan_unchanged(): void
    {
        $payment = $this->startCheckout('pro');
        $this->actingAs($this->user)
            ->post(route('billing.payment.simulate', $payment), ['outcome' => 'failure'])
            ->assertRedirect();

        $this->user->unsetRelation('subscription');
        $plan = $this->featureGateService->getEffectivePlan($this->user);
        $this->assertSame('FREE', $plan['id']);
    }

    public function test_payment_cancellation_leaves_plan_unchanged(): void
    {
        $payment = $this->startCheckout('pro');
        $this->actingAs($this->user)
            ->post(route('billing.payment.simulate', $payment), ['outcome' => 'cancelled'])
            ->assertRedirect();

        $this->user->unsetRelation('subscription');
        $plan = $this->featureGateService->getEffectivePlan($this->user);
        $this->assertSame('FREE', $plan['id']);

        $payment->refresh();
        $this->assertSame(SandboxPayment::STATUS_CANCELLED, $payment->status);
        $this->assertSame(SandboxInvoice::STATUS_CANCELLED, $payment->invoice->status);
    }

    public function test_subscription_cancel_returns_to_free(): void
    {
        $payment = $this->startCheckout('pro');
        app(BillingService::class)->simulateSuccess($payment);
        $payment->refresh();

        $this->user->unsetRelation('subscription');
        $this->assertSame('PRO', $this->featureGateService->getEffectivePlan($this->user)['id']);

        $this->actingAs($this->user)
            ->post(route('billing.cancel'))
            ->assertRedirect();

        $this->user->unsetRelation('subscription');
        $this->assertSame('FREE', $this->featureGateService->getEffectivePlan($this->user)['id']);
    }

    // === Phase 6: Idempotency ===

    public function test_duplicate_checkout_reuses_pending_payment(): void
    {
        $key = 'test-idempotency-key-123';

        $this->actingAs($this->user)
            ->post(route('billing.checkout'), ['plan_code' => 'pro', 'idempotency_key' => $key])
            ->assertRedirect();

        $firstPayment = SandboxPayment::where('user_id', $this->user->id)->first();

        $this->actingAs($this->user)
            ->post(route('billing.checkout'), ['plan_code' => 'pro', 'idempotency_key' => $key])
            ->assertRedirect();

        $this->assertSame(1, SandboxInvoice::where('user_id', $this->user->id)->where('idempotency_key', $key)->count());
        $this->assertSame(1, SandboxPayment::where('user_id', $this->user->id)->count());
    }

    public function test_same_key_for_different_plan_creates_distinct_attempt(): void
    {
        $key = 'same-key-different-plan';
        $service = app(BillingService::class);
        $pro = BillingPlan::where('code', 'pro')->firstOrFail();
        $business = BillingPlan::where('code', 'business')->firstOrFail();

        $proPayment = $service->startCheckout($this->user, $pro, $key);
        $businessPayment = $service->startCheckout($this->user, $business, $key);

        $this->assertNotSame($proPayment->id, $businessPayment->id);
        $this->assertSame($pro->id, $proPayment->invoice->plan_id);
        $this->assertSame($business->id, $businessPayment->invoice->plan_id);
        $this->assertSame(2, SandboxInvoice::where('user_id', $this->user->id)->where('idempotency_key', $key)->count());
    }

    public function test_terminal_checkout_retries_return_existing_attempt(): void
    {
        $service = app(BillingService::class);
        $plan = BillingPlan::where('code', 'pro')->firstOrFail();

        foreach (['success', 'failure', 'cancellation'] as $outcome) {
            $key = 'terminal-retry-'.$outcome;
            $payment = $service->startCheckout($this->user, $plan, $key);

            match ($outcome) {
                'success' => $service->simulateSuccess($payment),
                'failure' => $service->simulateFailure($payment),
                'cancellation' => $service->simulateCancellation($payment),
            };

            $retried = $service->startCheckout($this->user, $plan, $key);
            $this->assertSame($payment->id, $retried->id);
            $this->assertSame(1, SandboxInvoice::where('user_id', $this->user->id)->where('plan_id', $plan->id)->where('idempotency_key', $key)->count());
            $this->assertSame(1, SandboxPayment::where('invoice_id', $payment->invoice_id)->count());
        }
    }

    public function test_database_enforces_one_payment_per_invoice(): void
    {
        $payment = $this->startCheckout('pro');

        try {
            SandboxPayment::create([
                'user_id' => $payment->user_id,
                'invoice_id' => $payment->invoice_id,
                'provider' => SandboxSimulatorProvider::IDENTIFIER,
                'amount' => $payment->amount,
                'currency' => $payment->currency,
                'status' => SandboxPayment::STATUS_PENDING,
                'simulated' => true,
            ]);
            $this->fail('A second payment for one invoice must violate the database constraint.');
        } catch (QueryException) {
            $this->assertSame(1, SandboxPayment::where('invoice_id', $payment->invoice_id)->count());
        }
    }

    public function test_different_user_same_idempotency_key_creates_separate(): void
    {
        $key = 'shared-key-456';
        $other = User::factory()->create();

        $service = app(BillingService::class);
        $plan = BillingPlan::where('code', 'pro')->firstOrFail();

        $service->startCheckout($this->user, $plan, $key);
        $service->startCheckout($other, $plan, $key);

        $this->assertSame(1, SandboxInvoice::where('user_id', $this->user->id)->count());
        $this->assertSame(1, SandboxInvoice::where('user_id', $other->id)->count());
    }

    public function test_different_plan_different_key(): void
    {
        $this->actingAs($this->user)
            ->post(route('billing.checkout'), ['plan_code' => 'pro'])
            ->assertRedirect();

        $this->actingAs($this->user)
            ->post(route('billing.checkout'), ['plan_code' => 'business'])
            ->assertRedirect();

        $this->assertSame(2, SandboxInvoice::where('user_id', $this->user->id)->count());
    }

    // === Phase 7: Replay and concurrency ===

    public function test_replay_success_does_not_extend_subscription(): void
    {
        $payment = $this->startCheckout('pro');
        app(BillingService::class)->simulateSuccess($payment);

        $this->user->unsetRelation('subscription');
        $originalEnds = $this->user->subscription->current_period_ends_at;

        // Replayed success returns same result
        $replayed = app(BillingService::class)->simulateSuccess($payment);
        $this->assertSame(SandboxPayment::STATUS_SIMULATED_PAID, $replayed->status);

        $this->user->unsetRelation('subscription');
        $this->assertEquals($originalEnds, $this->user->subscription->current_period_ends_at);
    }

    public function test_replay_failure_remains_failed(): void
    {
        $payment = $this->startCheckout('pro');
        app(BillingService::class)->simulateFailure($payment);

        $replayed = app(BillingService::class)->simulateFailure($payment);
        $this->assertSame(SandboxPayment::STATUS_FAILED, $replayed->status);
    }

    public function test_success_after_failure_is_refused(): void
    {
        $payment = $this->startCheckout('pro');
        app(BillingService::class)->simulateFailure($payment);

        $this->expectException(RuntimeException::class);
        app(BillingService::class)->simulateSuccess($payment);
    }

    public function test_failure_after_success_is_refused(): void
    {
        $payment = $this->startCheckout('pro');
        app(BillingService::class)->simulateSuccess($payment);

        $this->expectException(RuntimeException::class);
        app(BillingService::class)->simulateFailure($payment);
    }

    public function test_replay_cancellation_idempotent(): void
    {
        $payment = $this->startCheckout('pro');
        app(BillingService::class)->simulateCancellation($payment);

        $replayed = app(BillingService::class)->simulateCancellation($payment);
        $this->assertSame(SandboxPayment::STATUS_CANCELLED, $replayed->status);
    }

    public function test_success_after_cancel_is_refused(): void
    {
        $payment = $this->startCheckout('pro');
        app(BillingService::class)->simulateCancellation($payment);

        $this->expectException(RuntimeException::class);
        app(BillingService::class)->simulateSuccess($payment);
    }

    public function test_failure_after_cancel_is_refused(): void
    {
        $payment = $this->startCheckout('pro');
        app(BillingService::class)->simulateCancellation($payment);

        $this->expectException(RuntimeException::class);
        app(BillingService::class)->simulateFailure($payment);
    }

    public function test_http_transition_refusal_is_handled_without_server_error(): void
    {
        $payment = $this->startCheckout('pro');
        app(BillingService::class)->simulateSuccess($payment);

        $this->actingAs($this->user)
            ->post(route('billing.payment.simulate', $payment), ['outcome' => 'failure'])
            ->assertRedirect(route('plans.index'));

        $this->assertSame(SandboxPayment::STATUS_SIMULATED_PAID, $payment->refresh()->status);
    }

    public function test_all_cross_terminal_transitions_are_refused(): void
    {
        $service = app(BillingService::class);

        $paid = $this->startCheckout('pro');
        $service->simulateSuccess($paid);
        foreach (['failure', 'cancellation'] as $transition) {
            try {
                $transition === 'failure'
                    ? $service->simulateFailure($paid)
                    : $service->simulateCancellation($paid);
                $this->fail('A paid payment cannot transition to '.$transition.'.');
            } catch (RuntimeException) {
                $this->assertSame(SandboxPayment::STATUS_SIMULATED_PAID, $paid->refresh()->status);
            }
        }

        $failed = $this->startCheckout('business');
        $service->simulateFailure($failed);
        $this->expectException(RuntimeException::class);
        $service->simulateCancellation($failed);
    }

    public function test_unknown_plan_mapping_fails_closed(): void
    {
        $plan = new BillingPlan(['code' => 'unmapped', 'price_amount' => 1]);

        $this->expectException(RuntimeException::class);
        $plan->featureGatePlan();
    }

    public function test_tampered_attempt_is_refused_before_transition(): void
    {
        $payment = $this->startCheckout('pro');
        $payment->invoice()->update(['simulated' => false]);

        try {
            app(BillingService::class)->simulateSuccess($payment);
            $this->fail('A non-simulated invoice must be refused.');
        } catch (RuntimeException) {
            $this->assertSame(SandboxPayment::STATUS_PENDING, $payment->refresh()->status);
            $this->assertSame(SandboxInvoice::STATUS_OPEN, $payment->invoice->status);
        }
    }

    public function test_all_payment_and_invoice_invariants_are_checked(): void
    {
        $other = User::factory()->create();
        $tamperingCases = [
            'payment_simulated',
            'provider',
            'ownership',
            'payment_amount',
            'payment_currency',
            'invoice_amount',
            'invoice_currency',
        ];

        foreach ($tamperingCases as $case) {
            $payment = $this->startCheckout('pro');

            match ($case) {
                'payment_simulated' => $payment->update(['simulated' => false]),
                'provider' => $payment->update(['provider' => 'unsupported']),
                'ownership' => $payment->update(['user_id' => $other->id]),
                'payment_amount' => $payment->update(['amount' => $payment->amount + 1]),
                'payment_currency' => $payment->update(['currency' => 'USD']),
                'invoice_amount' => $payment->invoice()->update(['amount' => $payment->amount + 1]),
                'invoice_currency' => $payment->invoice()->update(['currency' => 'USD']),
            };

            try {
                app(BillingService::class)->simulateFailure($payment);
                $this->fail('Tampering case ['.$case.'] must fail closed.');
            } catch (RuntimeException) {
                $this->assertSame(SandboxPayment::STATUS_PENDING, $payment->refresh()->status);
            }
        }
    }

    public function test_inactive_plan_is_refused_before_transition(): void
    {
        $payment = $this->startCheckout('pro');
        $payment->invoice->plan()->update(['active' => false]);

        $this->expectException(RuntimeException::class);
        app(BillingService::class)->simulateSuccess($payment);
    }

    // === Cross-account and security ===

    public function test_user_cannot_access_another_users_payment(): void
    {
        $payment = $this->startCheckout('pro');
        $other = User::factory()->create();

        $this->actingAs($other)
            ->get(route('billing.payment.show', $payment))
            ->assertNotFound();

        $this->actingAs($other)
            ->post(route('billing.payment.simulate', $payment), ['outcome' => 'success'])
            ->assertNotFound();
    }

    public function test_all_records_marked_simulated(): void
    {
        $payment = $this->startCheckout('pro');
        app(BillingService::class)->simulateSuccess($payment);

        $this->assertSame(0, SandboxInvoice::where('simulated', false)->count());
        $this->assertSame(0, SandboxPayment::where('simulated', false)->count());
    }

    public function test_no_external_http_calls_during_full_flow(): void
    {
        $payment = $this->startCheckout('pro');
        $this->actingAs($this->user)
            ->post(route('billing.payment.simulate', $payment), ['outcome' => 'success'])
            ->assertRedirect();

        Http::assertNothingSent();
    }

    public function test_billing_page_does_not_expose_secrets(): void
    {
        $payment = $this->startCheckout('pro');
        $response = $this->actingAs($this->user)->get(route('billing.payment.show', $payment));
        $body = $response->getContent();
        $this->assertIsString($body);
        $this->assertStringNotContainsString('sk_live', $body);
        $this->assertStringNotContainsString((string) config('app.key'), $body);
    }

    public function test_user_cannot_supply_arbitrary_price(): void
    {
        $payment = $this->startCheckout('pro');
        $proPlan = BillingPlan::where('code', 'pro')->firstOrFail();

        $payment->refresh();
        $this->assertSame($proPlan->price_amount, $payment->amount);
    }

    public function test_subscription_metadata_records_sandbox_source(): void
    {
        Subscription::create([
            'user_id' => $this->user->id,
            'plan' => 'FREE',
            'status' => 'ACTIVE',
            'metadata' => ['preserved' => 'yes'],
        ]);
        $payment = $this->startCheckout('pro');
        app(BillingService::class)->simulateSuccess($payment);
        $payment->refresh();

        $this->user->unsetRelation('subscription');
        $meta = $this->user->subscription->metadata;
        $this->assertSame('sandbox', $meta['source']);
        $this->assertTrue($meta['simulated']);
        $this->assertSame('yes', $meta['preserved']);
        $this->assertSame($payment->invoice->invoice_number, $meta['invoice_identifier']);
        $this->assertSame($payment->id, $meta['payment_identifier']);
        $this->assertSame($payment->provider_reference, $meta['provider_reference']);
        $this->assertSame('pro', $meta['billing_plan_code']);
    }

    public function test_subscription_cancellation_clears_paid_and_trial_dates_but_preserves_metadata(): void
    {
        Subscription::create([
            'user_id' => $this->user->id,
            'plan' => 'PRO',
            'status' => 'ACTIVE',
            'trial_starts_at' => Carbon::now()->subDay(),
            'trial_ends_at' => Carbon::now()->addDay(),
            'current_period_starts_at' => Carbon::now()->subDay(),
            'current_period_ends_at' => Carbon::now()->addMonth(),
            'metadata' => ['preserved' => 'yes'],
        ]);

        app(BillingService::class)->cancelSubscription($this->user);
        $subscription = $this->user->fresh()->subscription;

        $this->assertSame('FREE', $subscription->plan);
        $this->assertSame('ACTIVE', $subscription->status);
        $this->assertNull($subscription->trial_starts_at);
        $this->assertNull($subscription->trial_ends_at);
        $this->assertNull($subscription->current_period_starts_at);
        $this->assertNull($subscription->current_period_ends_at);
        $this->assertNotNull($subscription->canceled_at);
        $this->assertSame('yes', $subscription->metadata['preserved']);
        $this->assertTrue($subscription->metadata['sandbox_cancellation']);
    }

    private function startCheckout(string $planCode): SandboxPayment
    {
        $this->actingAs($this->user)
            ->post(route('billing.checkout'), ['plan_code' => $planCode])
            ->assertRedirect();

        return SandboxPayment::where('user_id', $this->user->id)->latest('id')->firstOrFail();
    }
}
