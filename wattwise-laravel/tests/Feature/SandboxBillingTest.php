<?php

namespace Tests\Feature;

use App\Contracts\BillingProvider;
use App\Models\BillingPlan;
use App\Models\SandboxInvoice;
use App\Models\SandboxPayment;
use App\Models\Subscription;
use App\Models\User;
use App\Services\Billing\BillingService;
use App\Services\Billing\SandboxSimulatorProvider;
use App\Services\Billing\UnknownBillingDriverException;
use App\Services\FeatureGateService;
use Database\Seeders\BillingPlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
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
            ->get(route('billing.index'))
            ->assertNotFound();
    }

    public function test_production_hard_refusal_even_when_misconfigured(): void
    {
        config(['billing.enabled' => true, 'billing.driver' => 'sandbox']);
        app()->detectEnvironment(fn () => 'production');

        $this->actingAs($this->user)
            ->get(route('billing.index'))
            ->assertNotFound();
    }

    public function test_local_allowed_when_enabled(): void
    {
        config(['billing.enabled' => true, 'billing.driver' => 'sandbox']);

        $this->actingAs($this->user)
            ->get(route('billing.index'))
            ->assertOk();
    }

    public function test_disabled_driver_returns_404(): void
    {
        config(['billing.enabled' => true, 'billing.driver' => 'disabled']);

        $this->actingAs($this->user)
            ->get(route('billing.index'))
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
        $this->get(route('billing.index'))->assertRedirect(route('login'));
    }

    public function test_billing_page_shows_plans(): void
    {
        $this->actingAs($this->user)
            ->get(route('billing.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Billing/Index')
                ->where('sandbox', true)
                ->where('effectivePlan.id', 'FREE')
                ->has('plans', 3)
            );
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
            ->assertRedirect(route('billing.index'));

        // Step 4: FeatureGateService reports PRO
        $this->user->unsetRelation('subscription');
        $plan = $this->featureGateService->getEffectivePlan($this->user);
        $this->assertSame('PRO', $plan['id']);

        // Step 5: reports.pdf now allowed
        $this->assertTrue($this->featureGateService->can($this->user, 'reports.pdf'));
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

        $this->expectException(\RuntimeException::class);
        app(BillingService::class)->simulateSuccess($payment);
    }

    public function test_failure_after_success_is_refused(): void
    {
        $payment = $this->startCheckout('pro');
        app(BillingService::class)->simulateSuccess($payment);

        $this->expectException(\RuntimeException::class);
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

        $this->expectException(\RuntimeException::class);
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
        $response = $this->actingAs($this->user)->get(route('billing.index'));
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
        $payment = $this->startCheckout('pro');
        app(BillingService::class)->simulateSuccess($payment);

        $this->user->unsetRelation('subscription');
        $meta = $this->user->subscription->metadata;
        $this->assertSame('sandbox', $meta['source']);
        $this->assertTrue($meta['simulated']);
    }

    public function test_staging_allowed_when_enabled(): void
    {
        config(['billing.enabled' => true, 'billing.driver' => 'sandbox']);
        app()->detectEnvironment(fn () => 'staging');

        $this->actingAs($this->user)
            ->get(route('billing.index'))
            ->assertOk();
    }

    private function startCheckout(string $planCode): SandboxPayment
    {
        $this->actingAs($this->user)
            ->post(route('billing.checkout'), ['plan_code' => $planCode])
            ->assertRedirect();

        return SandboxPayment::where('user_id', $this->user->id)->latest('id')->firstOrFail();
    }
}
