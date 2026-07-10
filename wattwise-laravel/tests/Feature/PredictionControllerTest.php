<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\ElectricityEntry;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class PredictionControllerTest extends TestCase
{
    use RefreshDatabase;

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
     *
     * @param array<int, float> $usages
     */
    private function seedMonths(Business $business, array $usages, float $tariff = 1000.0): void
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

    private function predictionProps($response): array
    {
        return $response->original->getData()['page']['props']['prediction'];
    }

    // ---------------------------------------------------------------------
    // Auth
    // ---------------------------------------------------------------------

    public function test_guest_is_rejected(): void
    {
        $this->get(route('predictions.index'))->assertRedirect('/login');
        $this->post(route('predictions.generate'), ['business_id' => 1])->assertRedirect('/login');
    }

    public function test_authenticated_route_works(): void
    {
        $user = User::factory()->create();
        $this->makeBusiness($user);

        $this->actingAs($user)
            ->get(route('predictions.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Predictions/Index'));
    }

    public function test_generate_redirects_with_generated_flag(): void
    {
        $user = User::factory()->create();
        $business = $this->makeBusiness($user);

        $response = $this->actingAs($user)->post(route('predictions.generate'), [
            'business_id' => $business->id,
        ]);

        $response->assertRedirect();
        $location = $response->headers->get('Location');
        $this->assertStringContainsString('business_id=' . $business->id, $location);
        $this->assertStringContainsString('generated=1', $location);
    }

    // ---------------------------------------------------------------------
    // Ownership isolation
    // ---------------------------------------------------------------------

    public function test_user_cannot_view_another_users_business(): void
    {
        $userA = User::factory()->create();
        $businessA = $this->makeBusiness($userA);

        $userB = User::factory()->create();
        $businessB = $this->makeBusiness($userB);

        // User A requests User B's business id → must fall back to their own.
        $this->actingAs($userA)
            ->get(route('predictions.index', ['business_id' => $businessB->id]))
            ->assertInertia(fn ($page) => $page->where('activeBusinessId', $businessA->id));
    }

    public function test_user_cannot_generate_for_another_users_business(): void
    {
        $userA = User::factory()->create();
        $this->makeBusiness($userA);

        $userB = User::factory()->create();
        $businessB = $this->makeBusiness($userB);

        $this->actingAs($userA)
            ->post(route('predictions.generate'), ['business_id' => $businessB->id])
            ->assertSessionHasErrors('business_id');
    }

    // ---------------------------------------------------------------------
    // Data states
    // ---------------------------------------------------------------------

    public function test_no_data_returns_no_prediction(): void
    {
        $user = User::factory()->create();
        $business = $this->makeBusiness($user);

        $this->actingAs($user)
            ->get(route('predictions.index', ['business_id' => $business->id, 'generated' => 1]))
            ->assertInertia(fn ($page) => $page->where('prediction.has_prediction', false));
    }

    public function test_partial_data_needs_more_data(): void
    {
        $user = User::factory()->create();
        $business = $this->makeBusiness($user);
        $this->seedMonths($business, [800, 900]); // 2 months

        $this->actingAs($user)
            ->get(route('predictions.index', ['business_id' => $business->id, 'generated' => 1]))
            ->assertInertia(fn ($page) => $page
                ->where('prediction.has_prediction', true)
                ->where('prediction.data_requirements.needs_more_data', true)
            );
    }

    public function test_complete_data_uses_hybrid_method(): void
    {
        $user = User::factory()->create();
        $business = $this->makeBusiness($user);
        $this->seedMonths($business, [800, 810, 805]); // 3 months

        $this->actingAs($user)
            ->get(route('predictions.index', ['business_id' => $business->id, 'generated' => 1]))
            ->assertInertia(fn ($page) => $page
                ->where('prediction.has_prediction', true)
                ->where('prediction.method_label', 'Hybrid AI Decision Support')
                ->where('prediction.data_requirements.needs_more_data', false)
            );
    }

    // ---------------------------------------------------------------------
    // Gating
    // ---------------------------------------------------------------------

    public function test_free_user_has_detailed_analysis_locked_but_summary_visible(): void
    {
        $user = User::factory()->create(); // no subscription => FREE
        $business = $this->makeBusiness($user);
        $this->seedMonths($business, [500, 900, 1300]); // rising => would have causes if unlocked

        $this->actingAs($user)
            ->get(route('predictions.index', ['business_id' => $business->id, 'generated' => 1]))
            ->assertInertia(fn ($page) => $page
                ->where('prediction.has_prediction', true)
                ->where('prediction.is_detailed_analysis_locked', true)
                ->where('prediction.possible_causes', [])
                // Summary is NOT hidden from FREE:
                ->whereNot('prediction.predicted_usage_kwh', null)
            );
    }

    public function test_pro_trial_user_gets_full_details(): void
    {
        $user = User::factory()->create();
        Subscription::create([
            'user_id' => $user->id,
            'plan' => 'PRO_TRIAL',
            'status' => 'ACTIVE',
            'trial_ends_at' => Carbon::now()->addDays(20),
        ]);
        $business = $this->makeBusiness($user);
        $this->seedMonths($business, [500, 900, 1300]);

        $this->actingAs($user)
            ->get(route('predictions.index', ['business_id' => $business->id, 'generated' => 1]))
            ->assertInertia(fn ($page) => $page
                ->where('prediction.is_detailed_analysis_locked', false)
                ->has('prediction.possible_causes', 3)
            );
    }

    // ---------------------------------------------------------------------
    // Determinism
    // ---------------------------------------------------------------------

    public function test_generation_is_deterministic(): void
    {
        $user = User::factory()->create();
        $business = $this->makeBusiness($user);
        $this->seedMonths($business, [700, 800, 850, 900]);

        $first = $this->predictionProps(
            $this->actingAs($user)->get(route('predictions.index', ['business_id' => $business->id, 'generated' => 1]))
        );
        $second = $this->predictionProps(
            $this->actingAs($user)->get(route('predictions.index', ['business_id' => $business->id, 'generated' => 1]))
        );

        $this->assertEquals($first, $second);
    }
}
