<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\User;
use App\Models\Appliance;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RecommendationControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Business $business;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->business = Business::create([
            'user_id' => $this->user->id,
            'name' => 'Kos Melati',
            'business_type' => 'KOS_PROPERTY',
        ]);
    }

    /**
     * Test guests are redirected from recommendations page.
     */
    public function test_guest_redirected_from_recommendations(): void
    {
        $response = $this->get(route('recommendations.index'));
        $response->assertRedirect(route('login'));
    }

    /**
     * Test authenticated user can view recommendations page.
     */
    public function test_authenticated_user_can_view_recommendations_page(): void
    {
        $this->actingAs($this->user);

        $response = $this->get(route('recommendations.index'));
        $response->assertOk();
    }

    /**
     * Test page includes recommendations for user's own business.
     */
    public function test_page_includes_recommendations_for_own_business(): void
    {
        $this->actingAs($this->user);

        $response = $this->get(route('recommendations.index'));
        $response->assertOk();

        // Inertia asserts the recommendations props exist
        $inertiaData = $response->original->getData();
        $this->assertArrayHasKey('recommendations', $inertiaData['page']['props']);
        
        // Since we have no entries, it should contain a missing electricity data recommendation
        $recs = $inertiaData['page']['props']['recommendations'];
        $types = collect($recs)->pluck('type')->toArray();
        $this->assertContains('MISSING_ELECTRICITY_DATA', $types);
    }

    /**
     * Test page does not leak another user's business recommendations or details.
     */
    public function test_page_does_not_leak_another_users_business_data(): void
    {
        // User B's business and custom appliance
        $userB = User::factory()->create();
        $businessB = Business::create([
            'user_id' => $userB->id,
            'name' => 'Laundry Bagus',
            'business_type' => 'LAUNDRY',
        ]);
        Appliance::create([
            'business_id' => $businessB->id,
            'name' => 'Mesin Cuci Jumbo',
            'watt' => 1500,
            'quantity' => 1,
            'hours_per_day' => 10,
            'days_per_month' => 30,
        ]);

        // Acting as User A (who has $this->business with NO appliances)
        $this->actingAs($this->user);

        $response = $this->get(route('recommendations.index'));
        $response->assertOk();

        $inertiaData = $response->original->getData();
        $recs = $inertiaData['page']['props']['recommendations'];

        // Should not see recommendations related to B's custom appliance
        $titles = collect($recs)->pluck('title')->implode(' ');
        $this->assertStringNotContainsString('Mesin Cuci Jumbo', $titles);
    }

    /**
     * Test user with no business shows onboarding empty state.
     */
    public function test_no_business_redirects_to_journey(): void
    {
        $userWithoutBusiness = User::factory()->create(['initial_plan_selected_at' => now()]);
        $this->actingAs($userWithoutBusiness);

        $response = $this->get(route('recommendations.index'));
        $response->assertRedirect(route('onboarding'));
    }
}
