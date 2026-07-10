<?php

namespace Tests\Feature;

use App\Models\Subscription;
use App\Models\User;
use App\Services\FeatureGateService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

/**
 * Step 1 — Effective Plan Contract & Entitlement Hardening.
 *
 * Locks the standardized effective plan contract, the final business limits,
 * and the Sprint 1 prediction/anomaly entitlement contract. Does NOT test
 * prediction/anomaly UI (not implemented yet) — only the entitlement gates.
 */
class EffectivePlanContractTest extends TestCase
{
    use RefreshDatabase;

    private FeatureGateService $gate;

    protected function setUp(): void
    {
        parent::setUp();
        $this->gate = $this->app->make(FeatureGateService::class);
    }

    private function subscribe(User $user, string $plan, array $overrides = []): Subscription
    {
        return Subscription::create(array_merge([
            'user_id' => $user->id,
            'plan' => $plan,
            'status' => 'ACTIVE',
        ], $overrides));
    }

    // ---------------------------------------------------------------------
    // Standardized contract shape
    // ---------------------------------------------------------------------

    public function test_effective_plan_exposes_standardized_contract_keys(): void
    {
        $user = User::factory()->create();

        $plan = $this->gate->getEffectivePlan($user);

        foreach (['id', 'label', 'is_trial', 'trial_ends_at', 'remaining_trial_days'] as $key) {
            $this->assertArrayHasKey($key, $plan, "Missing contract key: {$key}");
        }
    }

    // ---------------------------------------------------------------------
    // Plan resolution per tier
    // ---------------------------------------------------------------------

    public function test_missing_subscription_safely_falls_back_to_free(): void
    {
        $user = User::factory()->create();

        $plan = $this->gate->getEffectivePlan($user);

        $this->assertSame('FREE', $plan['id']);
        $this->assertSame('Gratis', $plan['label']);
        $this->assertFalse($plan['is_trial']);
        $this->assertNull($plan['trial_ends_at']);
        $this->assertSame(0, $plan['remaining_trial_days']);
    }

    public function test_free_plan_contract(): void
    {
        $user = User::factory()->create();
        $this->subscribe($user, 'FREE');

        $plan = $this->gate->getEffectivePlan($user);

        $this->assertSame('FREE', $plan['id']);
        $this->assertSame('Gratis', $plan['label']);
        $this->assertFalse($plan['is_trial']);
        $this->assertSame(0, $plan['remaining_trial_days']);
    }

    public function test_active_pro_trial_receives_pro_level_access(): void
    {
        $user = User::factory()->create();
        $this->subscribe($user, 'PRO_TRIAL', ['trial_ends_at' => Carbon::now()->addDays(30)]);

        $plan = $this->gate->getEffectivePlan($user);

        $this->assertSame('PRO_TRIAL', $plan['id']);
        $this->assertSame('Pro Trial', $plan['label']);
        $this->assertTrue($plan['is_trial']);
        $this->assertFalse($plan['is_expired']);
        $this->assertSame(30, $plan['remaining_trial_days']);

        // Active trial must receive Pro-level access.
        $this->assertTrue($this->gate->can($user, 'reports.full'));
        $this->assertTrue($this->gate->can($user, 'appliances.templates'));
        $this->assertTrue($this->gate->can($user, 'prediction.detailed'));
        $this->assertTrue($this->gate->can($user, 'anomaly.history'));
    }

    public function test_remaining_trial_days_rounds_up_partial_day(): void
    {
        $user = User::factory()->create();
        $this->subscribe($user, 'PRO_TRIAL', ['trial_ends_at' => Carbon::now()->addDays(14)->addHours(6)]);

        $plan = $this->gate->getEffectivePlan($user);

        $this->assertSame(15, $plan['remaining_trial_days']);
    }

    public function test_expired_trial_falls_back_safely_to_free(): void
    {
        $user = User::factory()->create();
        $this->subscribe($user, 'PRO_TRIAL', ['trial_ends_at' => Carbon::now()->subDay()]);

        $plan = $this->gate->getEffectivePlan($user);

        $this->assertSame('FREE', $plan['id']);
        $this->assertSame('Gratis', $plan['label']);
        $this->assertTrue($plan['is_trial']);
        $this->assertTrue($plan['is_expired']);
        $this->assertSame(0, $plan['remaining_trial_days']);

        // Access must revert to FREE entitlements.
        $this->assertFalse($this->gate->can($user, 'reports.full'));
        $this->assertFalse($this->gate->can($user, 'prediction.detailed'));
        $this->assertFalse($this->gate->can($user, 'anomaly.history'));
    }

    public function test_pro_plan_contract(): void
    {
        $user = User::factory()->create();
        $this->subscribe($user, 'PRO');

        $plan = $this->gate->getEffectivePlan($user);

        $this->assertSame('PRO', $plan['id']);
        $this->assertSame('Pro', $plan['label']);
        $this->assertFalse($plan['is_trial']);
        $this->assertSame(0, $plan['remaining_trial_days']);
    }

    public function test_business_plan_contract(): void
    {
        $user = User::factory()->create();
        $this->subscribe($user, 'BUSINESS');

        $plan = $this->gate->getEffectivePlan($user);

        $this->assertSame('BUSINESS', $plan['id']);
        $this->assertSame('Business', $plan['label']);
        $this->assertSame(50, $this->gate->limit($user, 'businesses.multiple'));
    }

    public function test_enterprise_plan_contract(): void
    {
        $user = User::factory()->create();
        $this->subscribe($user, 'ENTERPRISE');

        $plan = $this->gate->getEffectivePlan($user);

        $this->assertSame('ENTERPRISE', $plan['id']);
        $this->assertSame('Enterprise / Custom', $plan['label']);
        $this->assertNull($this->gate->limit($user, 'businesses.multiple'));
    }

    public function test_inactive_paid_plan_falls_back_to_free(): void
    {
        $user = User::factory()->create();
        $this->subscribe($user, 'PRO', ['status' => 'CANCELED']);

        $plan = $this->gate->getEffectivePlan($user);

        $this->assertSame('FREE', $plan['id']);
        $this->assertTrue($plan['is_expired']);
    }

    public function test_unknown_plan_string_falls_back_to_free(): void
    {
        $user = User::factory()->create();
        $this->subscribe($user, 'LEGACY_UNKNOWN');

        $plan = $this->gate->getEffectivePlan($user);

        $this->assertSame('FREE', $plan['id']);
    }

    // ---------------------------------------------------------------------
    // Final business limits
    // ---------------------------------------------------------------------

    public function test_business_limits_are_hardened_per_plan(): void
    {
        $expected = [
            'FREE' => 1,
            'PRO_TRIAL' => 3,
            'PRO' => 3,
            'BUSINESS' => 50,
            'ENTERPRISE' => null,
        ];

        foreach ($expected as $planId => $limit) {
            $user = User::factory()->create();

            if ($planId === 'PRO_TRIAL') {
                $this->subscribe($user, $planId, ['trial_ends_at' => Carbon::now()->addDays(10)]);
            } elseif ($planId !== 'FREE') {
                $this->subscribe($user, $planId);
            }

            $this->assertSame(
                $limit,
                $this->gate->limit($user, 'businesses.multiple'),
                "Unexpected business limit for {$planId}"
            );
        }
    }

    // ---------------------------------------------------------------------
    // Prediction / anomaly entitlement contract (Sprint 1)
    // ---------------------------------------------------------------------

    public function test_free_prediction_summary_allowed_but_details_locked(): void
    {
        $user = User::factory()->create();

        $this->assertTrue($this->gate->can($user, 'prediction.summary'));
        $this->assertFalse($this->gate->can($user, 'prediction.detailed'));
    }

    public function test_free_anomaly_summary_allowed_but_history_locked(): void
    {
        $user = User::factory()->create();

        $this->assertTrue($this->gate->can($user, 'anomaly.summary'));
        $this->assertFalse($this->gate->can($user, 'anomaly.detailed'));
        $this->assertFalse($this->gate->can($user, 'anomaly.history'));
    }

    public function test_pro_trial_and_above_receive_full_prediction_and_anomaly(): void
    {
        foreach (['PRO_TRIAL', 'PRO', 'BUSINESS', 'ENTERPRISE'] as $planId) {
            $user = User::factory()->create();

            if ($planId === 'PRO_TRIAL') {
                $this->subscribe($user, $planId, ['trial_ends_at' => Carbon::now()->addDays(10)]);
            } else {
                $this->subscribe($user, $planId);
            }

            $this->assertTrue($this->gate->can($user, 'prediction.summary'), "{$planId} prediction.summary");
            $this->assertTrue($this->gate->can($user, 'prediction.detailed'), "{$planId} prediction.detailed");
            $this->assertTrue($this->gate->can($user, 'anomaly.summary'), "{$planId} anomaly.summary");
            $this->assertTrue($this->gate->can($user, 'anomaly.detailed'), "{$planId} anomaly.detailed");
            $this->assertTrue($this->gate->can($user, 'anomaly.history'), "{$planId} anomaly.history");
        }
    }

    // ---------------------------------------------------------------------
    // Trial must never overwrite an active paid plan
    // ---------------------------------------------------------------------

    public function test_active_paid_plan_cannot_be_overwritten_by_trial(): void
    {
        $user = User::factory()->create();
        $this->subscribe($user, 'PRO');

        $this->actingAs($user)
            ->post(route('plans.trial'))
            ->assertSessionHas('error');

        $user->refresh();
        $this->assertSame('PRO', $user->subscription->plan);
        $this->assertSame('ACTIVE', $user->subscription->status);
        $this->assertSame('PRO', $this->gate->getEffectivePlan($user)['id']);
    }

    // ---------------------------------------------------------------------
    // Shared prop is user-driven, never demo-driven
    // ---------------------------------------------------------------------

    public function test_effective_plan_shared_prop_is_null_for_guests(): void
    {
        $this->get('/')->assertInertia(fn ($page) => $page->where('effectivePlan', null));
    }

    public function test_effective_plan_shared_prop_reflects_authenticated_user(): void
    {
        $user = User::factory()->create();
        $this->subscribe($user, 'PRO_TRIAL', ['trial_ends_at' => Carbon::now()->addDays(20)]);

        $this->actingAs($user)
            ->get(route('plans.index'))
            ->assertInertia(fn ($page) => $page
                ->where('effectivePlan.id', 'PRO_TRIAL')
                ->where('effectivePlan.label', 'Pro Trial')
                ->where('effectivePlan.is_trial', true)
                ->where('effectivePlan.remaining_trial_days', 20)
            );
    }
}
