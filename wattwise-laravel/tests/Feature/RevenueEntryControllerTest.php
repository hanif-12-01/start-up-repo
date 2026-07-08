<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\RevenueEntry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RevenueEntryControllerTest extends TestCase
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
            'name' => 'My Restaurant Business',
            'business_type' => 'FNB',
        ]);
    }

    /**
     * Test guests are redirected from revenue page.
     */
    public function test_guests_are_redirected_to_the_login_page_from_revenue()
    {
        $response = $this->get(route('revenue.index'));
        $response->assertRedirect(route('login'));
    }

    /**
     * Test authenticated users can visit revenue page.
     */
    public function test_authenticated_users_can_visit_revenue_page()
    {
        $this->actingAs($this->user);

        $response = $this->get(route('revenue.index'));
        $response->assertOk();
    }

    /**
     * Test user can submit valid revenue entry.
     */
    public function test_authenticated_user_can_create_revenue_entry_successfully()
    {
        $this->actingAs($this->user);

        $response = $this->post(route('revenue.store'), [
            'business_id' => $this->business->id,
            'period_month' => '2026-07-20',
            'revenue_amount_idr' => 25000000.00,
            'revenue_input_mode' => 'EXACT',
            'notes' => 'Pemasukan bersih dari kasir utama',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        // Verify normalization of period_month to first day of month (2026-07-01)
        $entry = RevenueEntry::where('business_id', $this->business->id)->first();
        $this->assertNotNull($entry);
        $this->assertEquals('2026-07-01', $entry->period_month->format('Y-m-d'));
        $this->assertEquals(25000000.00, (float) $entry->revenue_amount_idr);
        $this->assertEquals('EXACT', $entry->revenue_input_mode);
        $this->assertEquals('Pemasukan bersih dari kasir utama', $entry->notes);
    }

    /**
     * Test tenant isolation boundary.
     */
    public function test_user_cannot_create_revenue_entry_for_another_users_business()
    {
        $otherUser = User::factory()->create();
        $otherBusiness = Business::create([
            'user_id' => $otherUser->id,
            'name' => 'Other Retail Shop',
            'business_type' => 'RETAIL',
        ]);

        $this->actingAs($this->user);

        $response = $this->post(route('revenue.store'), [
            'business_id' => $otherBusiness->id,
            'period_month' => '2026-07-01',
            'revenue_amount_idr' => 15000000.00,
            'revenue_input_mode' => 'EXACT',
        ]);

        $response->assertSessionHasErrors(['business_id']);
        
        $entry = RevenueEntry::where('business_id', $otherBusiness->id)->first();
        $this->assertNull($entry);
    }

    /**
     * Test duplicate month upserts/updates correctly.
     */
    public function test_duplicate_revenue_month_upserts_correctly()
    {
        // First entry creation
        RevenueEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-07-01',
            'revenue_amount_idr' => 20000000.00,
            'revenue_input_mode' => 'EXACT',
        ]);

        $this->actingAs($this->user);

        // Submit to same month with updated values
        $response = $this->post(route('revenue.store'), [
            'business_id' => $this->business->id,
            'period_month' => '2026-07-10',
            'revenue_amount_idr' => 22000000.00,
            'revenue_input_mode' => 'RANGE',
            'notes' => 'Updated notes for July',
        ]);

        $response->assertRedirect();
        
        $entriesCount = RevenueEntry::where('business_id', $this->business->id)->count();
        $this->assertEquals(1, $entriesCount); // Ensure no duplicate row was created
        
        $entry = RevenueEntry::where('business_id', $this->business->id)->first();
        $this->assertNotNull($entry);
        $this->assertEquals('2026-07-01', $entry->period_month->format('Y-m-d'));
        $this->assertEquals(22000000.00, (float) $entry->revenue_amount_idr);
        $this->assertEquals('RANGE', $entry->revenue_input_mode);
        $this->assertEquals('Updated notes for July', $entry->notes);
    }
}
