<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class JourneyEnforcementTest extends TestCase
{
    use RefreshDatabase;

    // ── Journey bypass: user without plan choice ────────────────────

    public function test_user_without_plan_choice_cannot_get_onboarding(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $this->get(route('onboarding'))->assertRedirect(route('getting-started.plan'));
    }

    public function test_user_without_plan_choice_cannot_post_onboarding(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $this->post(route('onboarding.store'), [
            'name' => 'Test Biz',
            'business_type' => 'LAUNDRY',
            'city' => 'Jakarta',
            'province' => 'DKI Jakarta',
            'address' => 'Jl. Test',
            'customer_type' => 'R1',
            'power_va' => 2200,
            'tariff_per_kwh' => 1444.70,
            'payment_method' => 'PRABAYAR',
            'operating_days_per_month' => 30,
        ])->assertRedirect(route('getting-started.plan'));
    }

    public function test_blocked_onboarding_post_creates_no_business(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $this->post(route('onboarding.store'), [
            'name' => 'Test Biz',
            'business_type' => 'LAUNDRY',
            'city' => 'Jakarta',
            'province' => 'DKI Jakarta',
            'address' => 'Jl. Test',
            'customer_type' => 'R1',
            'power_va' => 2200,
            'tariff_per_kwh' => 1444.70,
            'payment_method' => 'PRABAYAR',
            'operating_days_per_month' => 30,
        ]);

        $this->assertDatabaseCount('businesses', 0);
    }

    #[DataProvider('productRouteProvider')]
    public function test_user_without_plan_choice_cannot_access_product_route(string $routeName): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $this->get(route($routeName))->assertRedirect(route('getting-started.plan'));
    }

    /**
     * @return array<string, array{string}>
     */
    public static function productRouteProvider(): array
    {
        return [
            'plans' => ['plans.index'],
            'electricity' => ['electricity.index'],
            'revenue' => ['revenue.index'],
            'appliances' => ['appliances.index'],
            'predictions' => ['predictions.index'],
            'anomalies' => ['anomalies.index'],
            'recommendations' => ['recommendations.index'],
            'reports' => ['reports.index'],
            'businesses' => ['businesses.index'],
            'dashboard' => ['dashboard'],
        ];
    }

    // ── Choice complete, no business ────────────────────────────────

    public function test_onboarding_get_allowed_after_plan_choice(): void
    {
        $user = User::factory()->create(['initial_plan_selected_at' => now()]);
        $this->actingAs($user);

        $this->get(route('onboarding'))->assertOk();
    }

    public function test_onboarding_post_allowed_after_plan_choice(): void
    {
        $user = User::factory()->create(['initial_plan_selected_at' => now()]);
        $this->actingAs($user);

        $response = $this->post(route('onboarding.store'), [
            'name' => 'Laundry Test',
            'business_type' => 'LAUNDRY',
            'city' => 'Bandung',
            'province' => 'Jawa Barat',
            'address' => 'Jl. Test',
            'customer_type' => 'R1',
            'power_va' => 2200,
            'tariff_per_kwh' => 1444.70,
            'payment_method' => 'PRABAYAR',
            'operating_days_per_month' => 30,
        ]);

        $response->assertRedirect(route('dashboard'));
    }

    public function test_dashboard_redirects_to_onboarding_when_choice_complete_no_business(): void
    {
        $user = User::factory()->create(['initial_plan_selected_at' => now()]);
        $this->actingAs($user);

        $this->get(route('dashboard'))->assertRedirect(route('onboarding'));
    }

    #[DataProvider('productRouteProvider')]
    public function test_product_routes_redirect_to_onboarding_when_choice_complete_no_business(string $routeName): void
    {
        $user = User::factory()->create(['initial_plan_selected_at' => now()]);
        $this->actingAs($user);

        $this->get(route($routeName))->assertRedirect(route('onboarding'));
    }

    public function test_no_redirect_loop_for_onboarding(): void
    {
        $user = User::factory()->create(['initial_plan_selected_at' => now()]);
        $this->actingAs($user);

        $response = $this->get(route('onboarding'));
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->component('Onboarding'));
    }

    // ── Existing subscriptions ──────────────────────────────────────

    public function test_active_pro_subscriber_without_business_goes_to_onboarding(): void
    {
        $user = User::factory()->create();
        Subscription::create([
            'user_id' => $user->id,
            'plan' => 'PRO',
            'status' => 'ACTIVE',
            'current_period_starts_at' => now(),
            'current_period_ends_at' => now()->addMonth(),
        ]);
        $this->actingAs($user);

        $this->get(route('dashboard'))->assertRedirect(route('onboarding'));
    }

    public function test_active_business_subscriber_without_business_goes_to_onboarding(): void
    {
        $user = User::factory()->create();
        Subscription::create([
            'user_id' => $user->id,
            'plan' => 'BUSINESS',
            'status' => 'ACTIVE',
            'current_period_starts_at' => now(),
            'current_period_ends_at' => now()->addMonth(),
        ]);
        $this->actingAs($user);

        $this->get(route('dashboard'))->assertRedirect(route('onboarding'));
    }

    public function test_current_pro_trial_user_without_business_goes_to_onboarding(): void
    {
        $user = User::factory()->create();
        Subscription::create([
            'user_id' => $user->id,
            'plan' => 'PRO_TRIAL',
            'status' => 'ACTIVE',
            'trial_starts_at' => now(),
            'trial_ends_at' => now()->addDays(30),
        ]);
        $this->actingAs($user);

        $this->get(route('dashboard'))->assertRedirect(route('onboarding'));
    }

    public function test_previously_used_trial_user_without_business_goes_to_onboarding(): void
    {
        $user = User::factory()->create();
        Subscription::create([
            'user_id' => $user->id,
            'plan' => 'FREE',
            'status' => 'ACTIVE',
            'trial_starts_at' => Carbon::parse('2026-05-01'),
            'trial_ends_at' => Carbon::parse('2026-05-31'),
        ]);
        $this->actingAs($user);

        $this->get(route('dashboard'))->assertRedirect(route('onboarding'));
    }

    public function test_free_subscription_user_without_business_goes_to_onboarding(): void
    {
        $user = User::factory()->create();
        Subscription::create([
            'user_id' => $user->id,
            'plan' => 'FREE',
            'status' => 'ACTIVE',
        ]);
        $this->actingAs($user);

        $this->get(route('dashboard'))->assertRedirect(route('onboarding'));
    }

    public function test_existing_subscriber_not_required_to_choose_free(): void
    {
        $user = User::factory()->create();
        Subscription::create([
            'user_id' => $user->id,
            'plan' => 'PRO',
            'status' => 'ACTIVE',
            'current_period_starts_at' => now(),
            'current_period_ends_at' => now()->addMonth(),
        ]);
        $this->actingAs($user);

        $response = $this->get(route('getting-started.plan'));
        $response->assertRedirect(route('onboarding'));
    }

    // ── Trial consistency ───────────────────────────────────────────

    public function test_successful_trial_activation_marks_initial_plan_selected_at(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $this->post(route('getting-started.choose-trial'));

        $this->assertNotNull($user->fresh()->initial_plan_selected_at);
    }

    public function test_plan_controller_activation_uses_same_atomic_service(): void
    {
        $user = User::factory()->create(['initial_plan_selected_at' => now()]);
        Business::create(['user_id' => $user->id, 'name' => 'Test', 'business_type' => 'KOS_PROPERTY', 'status' => 'ACTIVE']);
        $this->actingAs($user);

        $this->post(route('plans.trial'));

        $subscription = $user->fresh()->subscription;
        $this->assertNotNull($subscription);
        $this->assertEquals('PRO_TRIAL', $subscription->plan);
    }

    public function test_repeated_request_preserves_trial_start(): void
    {
        $this->travelTo(Carbon::parse('2026-07-13 10:00:00'));
        $user = User::factory()->create();
        $this->actingAs($user);

        $this->post(route('getting-started.choose-trial'));
        $originalStart = $user->fresh()->subscription->trial_starts_at->toIso8601String();

        $this->travelTo(Carbon::parse('2026-07-20 10:00:00'));
        $this->post(route('getting-started.choose-trial'));
        $afterStart = $user->fresh()->subscription->trial_starts_at->toIso8601String();

        $this->assertEquals($originalStart, $afterStart);
    }

    public function test_repeated_request_preserves_trial_end(): void
    {
        $this->travelTo(Carbon::parse('2026-07-13 10:00:00'));
        $user = User::factory()->create();
        $this->actingAs($user);

        $this->post(route('getting-started.choose-trial'));
        $originalEnd = $user->fresh()->subscription->trial_ends_at->toIso8601String();

        $this->travelTo(Carbon::parse('2026-07-20 10:00:00'));
        $this->post(route('getting-started.choose-trial'));
        $afterEnd = $user->fresh()->subscription->trial_ends_at->toIso8601String();

        $this->assertEquals($originalEnd, $afterEnd);
    }

    public function test_paid_plans_remain_unchanged(): void
    {
        $user = User::factory()->create();
        Subscription::create([
            'user_id' => $user->id,
            'plan' => 'PRO',
            'status' => 'ACTIVE',
            'current_period_starts_at' => now(),
            'current_period_ends_at' => now()->addMonth(),
        ]);
        $this->actingAs($user);

        $this->post(route('getting-started.choose-trial'));

        $this->assertEquals('PRO', $user->fresh()->subscription->plan);
    }

    public function test_no_sandbox_payment_or_invoice_created_on_trial(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $this->post(route('getting-started.choose-trial'));

        $this->assertDatabaseCount('sandbox_invoices', 0);
        $this->assertDatabaseCount('sandbox_payments', 0);
    }

    // ── Security ────────────────────────────────────────────────────

    public function test_journey_state_is_not_mass_assignable(): void
    {
        $user = User::factory()->create();
        $user->fill(['initial_plan_selected_at' => now()]);

        $this->assertNull($user->initial_plan_selected_at);
    }

    public function test_unauthenticated_requests_remain_blocked(): void
    {
        $this->get(route('dashboard'))->assertRedirect(route('login'));
        $this->get(route('onboarding'))->assertRedirect(route('login'));
        $this->get(route('getting-started.plan'))->assertRedirect(route('login'));
    }

    public function test_another_users_state_cannot_be_modified(): void
    {
        $victim = User::factory()->create();
        $attacker = User::factory()->create();
        $this->actingAs($attacker);

        $this->post(route('getting-started.choose-trial'));

        $this->assertNull($victim->fresh()->initial_plan_selected_at);
        $this->assertNull($victim->fresh()->subscription);
    }

    public function test_csrf_remains_enabled(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->post(route('getting-started.choose-free'), [], [
            'X-CSRF-TOKEN' => 'invalid-token',
        ]);

        $this->assertContains($response->getStatusCode(), [419, 302]);
    }
}
