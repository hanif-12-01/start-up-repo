<?php

namespace Tests\Feature;

use App\Contracts\BillingProvider;
use App\Models\BillingPlan;
use App\Models\SandboxInvoice;
use App\Models\SandboxPayment;
use App\Models\User;
use App\Models\UserEntitlement;
use App\Services\Billing\BillingService;
use App\Services\Billing\SandboxSimulatorProvider;
use App\Services\Billing\UnknownBillingDriverException;
use Database\Seeders\BillingPlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SandboxBillingTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        // Fail loudly if any code attempts a real outbound HTTP call.
        Http::preventStrayRequests();
        Http::fake();

        $this->seed(BillingPlanSeeder::class);
        $this->user = User::factory()->create();
    }

    public function test_billing_driver_is_simulation_only_by_default(): void
    {
        $this->assertSame('sandbox_simulator', config('billing.driver'));
        $this->assertTrue(config('billing.simulation_only'));

        $provider = app(BillingProvider::class);
        $this->assertInstanceOf(SandboxSimulatorProvider::class, $provider);
        $this->assertTrue($provider->isSimulationOnly());
    }

    public function test_unknown_billing_driver_fails_closed(): void
    {
        config()->set('billing.driver', 'stripe');

        $this->expectException(UnknownBillingDriverException::class);

        // Rebind so the container re-resolves with the new driver.
        app()->forgetInstance(BillingProvider::class);
        app(BillingProvider::class);
    }

    public function test_seeded_plans_match_spec(): void
    {
        $this->assertDatabaseHas('billing_plans', ['code' => 'free', 'price_amount' => 0, 'currency' => 'IDR']);
        $this->assertDatabaseHas('billing_plans', ['code' => 'starter', 'price_amount' => 49000, 'interval' => 'monthly']);
        $this->assertDatabaseHas('billing_plans', ['code' => 'pro', 'price_amount' => 99000, 'interval' => 'monthly']);
    }

    public function test_guest_is_redirected_from_billing(): void
    {
        $this->get(route('billing.index'))->assertRedirect(route('login'));
    }

    public function test_billing_page_shows_plans_and_sandbox_flag(): void
    {
        $this->actingAs($this->user)
            ->get(route('billing.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Billing/Index')
                ->where('sandbox', true)
                ->where('currentPlan.code', 'free')
                ->has('plans', 3)
            );
    }

    public function test_checkout_creates_invoice_and_pending_payment(): void
    {
        $starter = BillingPlan::where('code', 'starter')->first();

        $this->actingAs($this->user)
            ->post(route('billing.checkout'), ['plan_code' => 'starter'])
            ->assertRedirect();

        $this->assertDatabaseHas('sandbox_invoices', [
            'user_id' => $this->user->id,
            'plan_id' => $starter->id,
            'amount' => 49000,
            'status' => SandboxInvoice::STATUS_OPEN,
            'simulated' => true,
        ]);

        $this->assertDatabaseHas('sandbox_payments', [
            'user_id' => $this->user->id,
            'amount' => 49000,
            'status' => SandboxPayment::STATUS_PENDING,
            'provider' => 'sandbox_simulator',
            'simulated' => true,
        ]);

        // No entitlement is granted yet.
        $this->assertNull($this->user->fresh()->entitlement?->plan_id);
    }

    public function test_successful_simulation_marks_paid_and_activates_entitlement(): void
    {
        $payment = $this->startCheckout('pro');

        $this->actingAs($this->user)
            ->post(route('billing.payment.simulate', $payment), ['outcome' => 'success'])
            ->assertRedirect(route('billing.index'));

        $payment->refresh();
        $this->assertSame(SandboxPayment::STATUS_SIMULATED_PAID, $payment->status);
        $this->assertNotNull($payment->provider_reference);
        $this->assertSame(SandboxInvoice::STATUS_PAID, $payment->invoice->status);
        $this->assertNotNull($payment->invoice->paid_at);

        $entitlement = $this->user->fresh()->entitlement;
        $this->assertSame(UserEntitlement::STATUS_ACTIVE, $entitlement->status);
        $this->assertSame(BillingPlan::where('code', 'pro')->value('id'), $entitlement->plan_id);
        $this->assertTrue($entitlement->isActivePaid());
    }

    public function test_failed_simulation_does_not_activate_entitlement(): void
    {
        $payment = $this->startCheckout('starter');

        $this->actingAs($this->user)
            ->post(route('billing.payment.simulate', $payment), ['outcome' => 'failure'])
            ->assertRedirect(route('billing.index'));

        $payment->refresh();
        $this->assertSame(SandboxPayment::STATUS_FAILED, $payment->status);
        $this->assertSame(SandboxInvoice::STATUS_FAILED, $payment->invoice->status);

        $entitlement = $this->user->fresh()->entitlement;
        $this->assertTrue($entitlement === null || ! $entitlement->isActivePaid());
    }

    public function test_pending_payment_never_grants_entitlement(): void
    {
        $this->startCheckout('pro');

        $entitlement = $this->user->fresh()->entitlement;
        $this->assertTrue($entitlement === null || ! $entitlement->isActivePaid());
    }

    public function test_free_selection_does_not_create_payment(): void
    {
        $this->actingAs($this->user)
            ->post(route('billing.checkout'), ['plan_code' => 'free'])
            ->assertRedirect(route('billing.index'));

        $this->assertDatabaseCount('sandbox_payments', 0);
        $this->assertSame('free', $this->user->fresh()->entitlement->status);
    }

    public function test_cancel_returns_user_to_free(): void
    {
        $payment = $this->startCheckout('pro');
        app(BillingService::class)->simulateSuccess($payment);

        $this->actingAs($this->user)
            ->post(route('billing.cancel'))
            ->assertRedirect(route('billing.index'));

        $entitlement = $this->user->fresh()->entitlement;
        $this->assertSame(UserEntitlement::STATUS_CANCELLED, $entitlement->status);
        $this->assertFalse($entitlement->isActivePaid());
    }

    public function test_user_cannot_access_another_users_payment(): void
    {
        $payment = $this->startCheckout('starter');
        $other = User::factory()->create();

        $this->actingAs($other)
            ->get(route('billing.payment.show', $payment))
            ->assertNotFound();

        $this->actingAs($other)
            ->post(route('billing.payment.simulate', $payment), ['outcome' => 'success'])
            ->assertNotFound();
    }

    public function test_all_invoice_and_payment_rows_are_marked_simulated(): void
    {
        $payment = $this->startCheckout('pro');
        app(BillingService::class)->simulateSuccess($payment);

        $this->assertSame(0, SandboxInvoice::where('simulated', false)->count());
        $this->assertSame(0, SandboxPayment::where('simulated', false)->count());
        $this->assertSame(0, SandboxPayment::where('provider', '!=', 'sandbox_simulator')->count());
    }

    public function test_no_external_http_calls_are_made_during_full_flow(): void
    {
        $payment = $this->startCheckout('pro');

        $this->actingAs($this->user)
            ->post(route('billing.payment.simulate', $payment), ['outcome' => 'success'])
            ->assertRedirect();

        // Http::preventStrayRequests() would have thrown on any real call.
        Http::assertNothingSent();
    }

    public function test_billing_page_does_not_expose_secrets(): void
    {
        $response = $this->actingAs($this->user)->get(route('billing.index'));

        $body = $response->getContent();
        $this->assertStringNotContainsString('sk_live', $body);
        $this->assertStringNotContainsString('secret', strtolower($body));
        $this->assertStringNotContainsString(config('app.key'), $body);
    }

    /**
     * Start a checkout for a paid plan and return the created pending payment.
     */
    private function startCheckout(string $planCode): SandboxPayment
    {
        $this->actingAs($this->user)
            ->post(route('billing.checkout'), ['plan_code' => $planCode])
            ->assertRedirect();

        return SandboxPayment::where('user_id', $this->user->id)->latest('id')->firstOrFail();
    }
}
