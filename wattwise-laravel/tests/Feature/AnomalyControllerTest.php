<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\ElectricityEntry;
use App\Models\Subscription;
use App\Models\User;
use App\Services\Anomalies\AnomalyService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class AnomalyControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
    }

    private function makeBusiness(User $user): Business
    {
        return Business::create([
            'user_id' => $user->id,
            'name' => 'Kos A',
            'business_type' => 'KOS_PROPERTY',
            'status' => 'ACTIVE',
        ]);
    }

    /**
     * Seed consecutive months of electricity usage (each with tariff).
     */
    private function seedMonths(Business $business, array $usages, float $tariff = 1500.0): void
    {
        $cursor = Carbon::parse('2026-01-01');
        foreach ($usages as $usage) {
            ElectricityEntry::create([
                'business_id' => $business->id,
                'period_month' => $cursor->format('Y-m-d'),
                'usage_kwh' => $usage,
                'tariff_per_kwh' => $tariff,
            ]);
            $cursor->addMonth();
        }
    }

    // ---------------------------------------------------------------------
    // 1. Guest Rejected
    // ---------------------------------------------------------------------
    public function test_guest_is_rejected(): void
    {
        $this->get(route('anomalies.index'))->assertRedirect('/login');
    }

    // ---------------------------------------------------------------------
    // 2. Ownership Isolation
    // ---------------------------------------------------------------------
    public function test_user_cannot_view_another_users_business(): void
    {
        $userA = User::factory()->create();
        $businessA = $this->makeBusiness($userA);

        $userB = User::factory()->create();
        $businessB = $this->makeBusiness($userB);

        // User A requests User B's business id → must fall back to their own.
        $this->actingAs($userA)
            ->get(route('anomalies.index', ['business_id' => $businessB->id]))
            ->assertInertia(fn ($page) => $page->where('activeBusinessId', $businessA->id));
    }

    // ---------------------------------------------------------------------
    // 3. No History / Empty State
    // ---------------------------------------------------------------------
    public function test_no_history_renders_empty_state(): void
    {
        $user = User::factory()->create();
        $business = $this->makeBusiness($user);

        $this->actingAs($user)
            ->get(route('anomalies.index', ['business_id' => $business->id]))
            ->assertInertia(fn ($page) => $page
                ->where('analysis.has_data', false)
                ->where('analysis.current_status', AnomalyService::STATUS_NORMAL)
                ->where('analysis.history', [])
            );
    }

    // ---------------------------------------------------------------------
    // 4. Partial History (Needs More Data Warning)
    // ---------------------------------------------------------------------
    public function test_partial_history_shows_warning(): void
    {
        $user = User::factory()->create();
        $business = $this->makeBusiness($user);
        $this->seedMonths($business, [100.0]); // 1 month of history (Jan 2026)

        // Requesting Jan 2026 - has data but no prior months to calculate baseline
        $this->actingAs($user)
            ->get(route('anomalies.index', ['business_id' => $business->id, 'month' => '2026-01']))
            ->assertInertia(fn ($page) => $page
                ->where('analysis.has_data', true)
                ->where('analysis.data_requirements.needs_more_data', true)
                ->where('analysis.baseline_usage_kwh', null)
            );
    }

    // ---------------------------------------------------------------------
    // 5. Full History & Calculations
    // ---------------------------------------------------------------------
    public function test_full_history_calculates_correctly(): void
    {
        $user = User::factory()->create();
        Subscription::create([
            'user_id' => $user->id,
            'plan' => 'PRO_TRIAL',
            'status' => 'ACTIVE',
            'trial_ends_at' => Carbon::now()->addDays(30),
        ]);
        $business = $this->makeBusiness($user);
        $this->seedMonths($business, [100.0, 100.0, 125.0]); // Jan, Feb, Mar

        // Requesting Mar 2026 (observed 125.0, baseline 100.0 -> 25% increase -> Boros)
        $this->actingAs($user)
            ->get(route('anomalies.index', ['business_id' => $business->id, 'month' => '2026-03']))
            ->assertInertia(fn ($page) => $page
                ->where('analysis.has_data', true)
                ->where('analysis.current_status', AnomalyService::STATUS_ANOMALY)
                ->where('analysis.baseline_usage_kwh', 100)
                ->where('analysis.observed_usage_kwh', 125)
                ->where('analysis.difference_percent', 25)
                ->where('analysis.data_requirements.needs_more_data', false)
            );
    }

    // ---------------------------------------------------------------------
    // 6. Month Filter
    // ---------------------------------------------------------------------
    public function test_month_filter_queries_specific_month(): void
    {
        $user = User::factory()->create();
        $business = $this->makeBusiness($user);
        $this->seedMonths($business, [100.0, 150.0]); // Jan, Feb

        // Query Jan 2026 (first month, no baseline)
        $this->actingAs($user)
            ->get(route('anomalies.index', ['business_id' => $business->id, 'month' => '2026-01']))
            ->assertInertia(fn ($page) => $page
                ->where('selectedMonth', '2026-01')
                ->where('analysis.observed_usage_kwh', 100)
            );

        // Query Feb 2026 (second month, has baseline Jan)
        $this->actingAs($user)
            ->get(route('anomalies.index', ['business_id' => $business->id, 'month' => '2026-02']))
            ->assertInertia(fn ($page) => $page
                ->where('selectedMonth', '2026-02')
                ->where('analysis.observed_usage_kwh', 150)
                ->where('analysis.baseline_usage_kwh', 100)
            );
    }

    // ---------------------------------------------------------------------
    // 7. Status Gating (FREE Lock)
    // ---------------------------------------------------------------------
    public function test_free_user_has_history_locked_and_details_hidden(): void
    {
        $user = User::factory()->create(); // FREE plan by default
        $business = $this->makeBusiness($user);
        $this->seedMonths($business, [100.0, 100.0, 100.0, 100.0, 125.0]); // Jan, Feb, Mar, Apr, May (5 months)

        $this->actingAs($user)
            ->get(route('anomalies.index', ['business_id' => $business->id, 'month' => '2026-05']))
            ->assertInertia(fn ($page) => $page
                ->where('analysis.is_full_history_locked', true)
                // History array sliced to 3 on backend
                ->has('analysis.history', 3)
                // Detailed analysis hidden
                ->where('analysis.possible_causes', [])
                ->where('analysis.recommended_actions', [])
            );
    }

    // ---------------------------------------------------------------------
    // 8. Status Gating (PRO_TRIAL Access)
    // ---------------------------------------------------------------------
    public function test_pro_trial_user_gets_full_details_and_unlocked_history(): void
    {
        $user = User::factory()->create();
        Subscription::create([
            'user_id' => $user->id,
            'plan' => 'PRO_TRIAL',
            'status' => 'ACTIVE',
            'trial_ends_at' => Carbon::now()->addDays(20),
        ]);
        $business = $this->makeBusiness($user);
        $this->seedMonths($business, [100.0, 100.0, 100.0, 100.0, 125.0]); // Jan, Feb, Mar, Apr, May

        $this->actingAs($user)
            ->get(route('anomalies.index', ['business_id' => $business->id, 'month' => '2026-05']))
            ->assertInertia(fn ($page) => $page
                ->where('analysis.is_full_history_locked', false)
                // Unlocked gets full history prior (4 months)
                ->has('analysis.history', 4)
                // Detailed analysis visible
                ->has('analysis.possible_causes', 3)
                ->has('analysis.recommended_actions', 2)
            );
    }

    // ---------------------------------------------------------------------
    // 9. Safe Wording
    // ---------------------------------------------------------------------
    public function test_safe_wording_constraints(): void
    {
        $user = User::factory()->create();
        Subscription::create([
            'user_id' => $user->id,
            'plan' => 'PRO_TRIAL',
            'status' => 'ACTIVE',
            'trial_ends_at' => Carbon::now()->addDays(20),
        ]);
        $business = $this->makeBusiness($user);
        $this->seedMonths($business, [100.0, 100.0, 130.0]); // triggers warning/anomaly

        $props = null;
        $response = $this->actingAs($user)->get(route('anomalies.index', ['business_id' => $business->id, 'month' => '2026-03']));
        $response->assertInertia(function ($page) use (&$props) {
            $props = $page->toArray()['props']['analysis'];
        });

        $allText = implode(' ', array_merge($props['possible_causes'], $props['recommended_actions'], [$props['disclaimer']], [$props['data_requirements']['message']]));

        // Check required wording
        $this->assertStringContainsString('Pemakaian tercatat', $allText);
        $this->assertStringContainsString('Kemungkinan penyebab yang perlu dicek', $allText);
        $this->assertStringContainsString('Berdasarkan data input', $allText);
        $this->assertStringContainsString('Ini adalah indikasi awal berbasis data input, bukan diagnosis teknis atau bukti kerusakan alat.', $allText);

        // Check forbidden terms
        $this->assertStringNotContainsString('kebocoran listrik terdeteksi', $allText);
        $this->assertStringNotContainsString('alat rusak', $allText);
        $this->assertStringNotContainsString('alat pasti boros', $allText);
        $this->assertStringNotContainsString('kerusakan alat terdeteksi', $allText);
        $this->assertStringNotContainsString('sensor membaca', $allText);
        $this->assertStringNotContainsString('AI memastikan', $allText);
    }

    // ---------------------------------------------------------------------
    // 10. Navigation
    // ---------------------------------------------------------------------
    public function test_navigation_route_resolves(): void
    {
        $user = User::factory()->create();
        $this->makeBusiness($user);

        // Assert route resolves
        $this->assertNotNull(route('anomalies.index'));

        // Assert route returns success
        $this->actingAs($user)
            ->get(route('anomalies.index'))
            ->assertOk();
    }
}
