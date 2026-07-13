<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Fortify\Features;
use Tests\TestCase;

class TrialOnboardingBridgeTest extends TestCase
{
    use RefreshDatabase;

    // ── Registration ────────────────────────────────────────────────

    public function test_registration_redirects_to_plan_choice(): void
    {
        $this->skipUnlessFortifyHas(Features::registration());

        $response = $this->post(route('register.store'), [
            'name' => 'New User',
            'email' => 'new@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('getting-started.plan', absolute: false));
    }

    public function test_registered_user_is_authenticated(): void
    {
        $this->skipUnlessFortifyHas(Features::registration());

        $this->post(route('register.store'), [
            'name' => 'Auth User',
            'email' => 'auth@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $this->assertAuthenticated();
    }

    public function test_no_business_created_during_registration(): void
    {
        $this->skipUnlessFortifyHas(Features::registration());

        $this->post(route('register.store'), [
            'name' => 'Biz User',
            'email' => 'biz@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $user = User::where('email', 'biz@example.com')->first();
        $this->assertNotNull($user);
        $this->assertFalse($user->businesses()->exists());
    }

    public function test_no_trial_activated_during_registration(): void
    {
        $this->skipUnlessFortifyHas(Features::registration());

        $this->post(route('register.store'), [
            'name' => 'Trial User',
            'email' => 'trial@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $user = User::where('email', 'trial@example.com')->first();
        $this->assertNull($user->subscription);
    }

    public function test_no_payment_created_during_registration(): void
    {
        $this->skipUnlessFortifyHas(Features::registration());

        $this->post(route('register.store'), [
            'name' => 'Pay User',
            'email' => 'pay@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $this->assertDatabaseCount('subscriptions', 0);
    }

    // ── Free Choice ─────────────────────────────────────────────────

    public function test_eligible_user_can_choose_free(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->post(route('getting-started.choose-free'));

        $response->assertRedirect(route('onboarding'));
        $user->refresh();
        $this->assertNotNull($user->initial_plan_selected_at);
    }

    public function test_free_choice_is_persisted(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $this->post(route('getting-started.choose-free'));

        $user->refresh();
        $this->assertNotNull($user->initial_plan_selected_at);
    }

    public function test_free_plan_remains_free(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $this->post(route('getting-started.choose-free'));

        $this->assertNull($user->fresh()->subscription);
        $this->assertDatabaseCount('subscriptions', 0);
    }

    public function test_free_redirects_to_onboarding(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->post(route('getting-started.choose-free'));

        $response->assertRedirect(route('onboarding'));
    }

    public function test_repeating_free_is_safe(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $this->post(route('getting-started.choose-free'));
        $firstTimestamp = $user->fresh()->initial_plan_selected_at;

        $this->travel(1)->minutes();
        $this->post(route('getting-started.choose-free'));
        $secondTimestamp = $user->fresh()->initial_plan_selected_at;

        $this->assertTrue($firstTimestamp->equalTo($secondTimestamp));
    }

    public function test_repeating_free_creates_no_duplicate(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $this->post(route('getting-started.choose-free'));
        $this->post(route('getting-started.choose-free'));

        $this->assertDatabaseCount('subscriptions', 0);
    }

    public function test_free_creates_no_sandbox_billing_record(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $this->post(route('getting-started.choose-free'));

        $this->assertDatabaseCount('sandbox_invoices', 0);
        $this->assertDatabaseCount('sandbox_payments', 0);
    }

    // ── Trial Choice ────────────────────────────────────────────────

    public function test_eligible_user_can_activate_trial(): void
    {
        $this->travelTo(Carbon::parse('2026-07-13 10:00:00'));
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->post(route('getting-started.choose-trial'));

        $response->assertRedirect(route('onboarding'));
        $user->refresh();
        $this->assertNotNull($user->initial_plan_selected_at);
        $this->assertNotNull($user->subscription);
        $this->assertEquals('PRO_TRIAL', $user->subscription->plan);
        $this->assertEquals('ACTIVE', $user->subscription->status);
    }

    public function test_trial_uses_canonical_plan_values(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $this->post(route('getting-started.choose-trial'));

        $subscription = $user->fresh()->subscription;
        $this->assertEquals('PRO_TRIAL', $subscription->plan);
        $this->assertEquals('ACTIVE', $subscription->status);
    }

    public function test_trial_dates_are_correct(): void
    {
        $this->travelTo(Carbon::parse('2026-07-13 10:00:00'));
        $user = User::factory()->create();
        $this->actingAs($user);

        $this->post(route('getting-started.choose-trial'));

        $subscription = $user->fresh()->subscription;
        $this->assertEquals('2026-07-13 10:00:00', $subscription->trial_starts_at->format('Y-m-d H:i:s'));
        $this->assertEquals('2026-08-12 10:00:00', $subscription->trial_ends_at->format('Y-m-d H:i:s'));
    }

    public function test_trial_choice_is_persisted(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $this->post(route('getting-started.choose-trial'));

        $this->assertNotNull($user->fresh()->initial_plan_selected_at);
    }

    public function test_trial_redirects_to_onboarding(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->post(route('getting-started.choose-trial'));

        $response->assertRedirect(route('onboarding'));
    }

    public function test_repeat_trial_does_not_extend(): void
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

    public function test_repeat_trial_does_not_restart(): void
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

    public function test_previously_used_trial_cannot_restart(): void
    {
        $user = User::factory()->create();
        Subscription::create([
            'user_id' => $user->id,
            'plan' => 'FREE',
            'status' => 'ACTIVE',
            'trial_starts_at' => Carbon::parse('2026-06-01'),
            'trial_ends_at' => Carbon::parse('2026-07-01'),
        ]);
        $this->actingAs($user);

        $response = $this->post(route('getting-started.choose-trial'));

        $response->assertRedirect(route('getting-started.plan'));
        $this->assertEquals('FREE', $user->fresh()->subscription->plan);
    }

    public function test_expired_trial_cannot_restart_silently(): void
    {
        $user = User::factory()->create();
        Subscription::create([
            'user_id' => $user->id,
            'plan' => 'PRO_TRIAL',
            'status' => 'ACTIVE',
            'trial_starts_at' => Carbon::parse('2026-05-01'),
            'trial_ends_at' => Carbon::parse('2026-05-31'),
        ]);
        $this->actingAs($user);

        $response = $this->post(route('getting-started.choose-trial'));

        $subscription = $user->fresh()->subscription;
        $this->assertTrue($subscription->trial_ends_at->equalTo(Carbon::parse('2026-05-31')));
    }

    public function test_active_paid_subscription_not_downgraded(): void
    {
        $user = User::factory()->create();
        Subscription::create([
            'user_id' => $user->id,
            'plan' => 'PRO',
            'status' => 'ACTIVE',
            'current_period_starts_at' => Carbon::now(),
            'current_period_ends_at' => Carbon::now()->addMonth(),
        ]);
        $this->actingAs($user);

        $this->post(route('getting-started.choose-trial'));

        $this->assertEquals('PRO', $user->fresh()->subscription->plan);
    }

    public function test_active_paid_subscription_not_overwritten(): void
    {
        $user = User::factory()->create();
        Subscription::create([
            'user_id' => $user->id,
            'plan' => 'BUSINESS',
            'status' => 'ACTIVE',
            'current_period_starts_at' => Carbon::now(),
            'current_period_ends_at' => Carbon::now()->addMonth(),
        ]);
        $this->actingAs($user);

        $response = $this->post(route('getting-started.choose-trial'));

        $response->assertRedirect(route('getting-started.plan'));
        $this->assertEquals('BUSINESS', $user->fresh()->subscription->plan);
    }

    public function test_trial_creates_no_sandbox_billing(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $this->post(route('getting-started.choose-trial'));

        $this->assertDatabaseCount('sandbox_invoices', 0);
        $this->assertDatabaseCount('sandbox_payments', 0);
    }

    // ── Journey Routing ─────────────────────────────────────────────

    public function test_user_without_plan_choice_sent_to_plan_choice(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('dashboard'));

        $response->assertRedirect(route('getting-started.plan'));
    }

    public function test_user_with_choice_no_business_sent_to_onboarding(): void
    {
        $user = User::factory()->create(['initial_plan_selected_at' => now()]);
        $this->actingAs($user);

        $response = $this->get(route('dashboard'));

        $response->assertRedirect(route('onboarding'));
    }

    public function test_user_with_business_allowed_to_dashboard(): void
    {
        $user = User::factory()->create();
        Business::create(['user_id' => $user->id, 'name' => 'Test Business', 'business_type' => 'KOS_PROPERTY', 'status' => 'ACTIVE']);
        $this->actingAs($user);

        $response = $this->get(route('dashboard'));

        $response->assertOk();
    }

    public function test_journey_routes_do_not_redirect_to_themselves(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('getting-started.plan'));

        $response->assertOk();
    }

    public function test_onboarding_route_does_not_loop(): void
    {
        $user = User::factory()->create(['initial_plan_selected_at' => now()]);
        $this->actingAs($user);

        $response = $this->get(route('onboarding'));

        $response->assertOk();
    }

    public function test_logout_remains_accessible(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->post(route('logout'));

        $response->assertRedirect('/');
        $this->assertGuest();
    }

    public function test_existing_users_with_businesses_backward_compatible(): void
    {
        $user = User::factory()->create(['initial_plan_selected_at' => null]);
        Business::create(['user_id' => $user->id, 'name' => 'Test Business', 'business_type' => 'KOS_PROPERTY', 'status' => 'ACTIVE']);
        $this->actingAs($user);

        $response = $this->get(route('dashboard'));

        $response->assertOk();
    }

    public function test_authenticated_destinations_usable_for_completed_users(): void
    {
        $user = User::factory()->create();
        Business::create(['user_id' => $user->id, 'name' => 'Test Business', 'business_type' => 'KOS_PROPERTY', 'status' => 'ACTIVE']);
        $this->actingAs($user);

        $this->get(route('plans.index'))->assertOk();
        $this->get(route('electricity.index'))->assertOk();
    }

    // ── Security ────────────────────────────────────────────────────

    public function test_unauthenticated_cannot_submit_free(): void
    {
        $response = $this->post(route('getting-started.choose-free'));

        $response->assertRedirect(route('login'));
    }

    public function test_unauthenticated_cannot_submit_trial(): void
    {
        $response = $this->post(route('getting-started.choose-trial'));

        $response->assertRedirect(route('login'));
    }

    public function test_another_users_subscription_unaffected(): void
    {
        $victim = User::factory()->create();
        Subscription::create([
            'user_id' => $victim->id,
            'plan' => 'PRO',
            'status' => 'ACTIVE',
            'current_period_starts_at' => Carbon::now(),
            'current_period_ends_at' => Carbon::now()->addMonth(),
        ]);

        $attacker = User::factory()->create();
        $this->actingAs($attacker);

        $this->post(route('getting-started.choose-trial'));

        $this->assertEquals('PRO', $victim->fresh()->subscription->plan);
    }

    public function test_plan_choice_page_renders_for_new_user(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('getting-started.plan'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('GettingStarted/Plan')
            ->has('trialEligible')
        );
    }

    public function test_plan_choice_redirects_user_with_business(): void
    {
        $user = User::factory()->create();
        Business::create(['user_id' => $user->id, 'name' => 'Test Business', 'business_type' => 'KOS_PROPERTY', 'status' => 'ACTIVE']);
        $this->actingAs($user);

        $response = $this->get(route('getting-started.plan'));

        $response->assertRedirect(route('dashboard'));
    }

    public function test_plan_choice_redirects_user_who_already_chose(): void
    {
        $user = User::factory()->create(['initial_plan_selected_at' => now()]);
        $this->actingAs($user);

        $response = $this->get(route('getting-started.plan'));

        $response->assertRedirect(route('onboarding'));
    }

    public function test_free_choice_redirects_to_dashboard_when_business_exists(): void
    {
        $user = User::factory()->create();
        Business::create(['user_id' => $user->id, 'name' => 'Test Business', 'business_type' => 'KOS_PROPERTY', 'status' => 'ACTIVE']);
        $this->actingAs($user);

        $response = $this->post(route('getting-started.choose-free'));

        $response->assertRedirect(route('dashboard'));
    }
}
