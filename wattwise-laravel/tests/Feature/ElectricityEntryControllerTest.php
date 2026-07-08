<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\ElectricityEntry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ElectricityEntryControllerTest extends TestCase
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
            'name' => 'My First Business',
            'business_type' => 'LAUNDRY',
        ]);
    }

    /**
     * Test guests are redirected from electricity page.
     */
    public function test_guests_are_redirected_to_the_login_page_from_electricity()
    {
        $response = $this->get(route('electricity.index'));
        $response->assertRedirect(route('login'));
    }

    /**
     * Test authenticated users can visit electricity page.
     */
    public function test_authenticated_users_can_visit_electricity_page()
    {
        $this->actingAs($this->user);

        $response = $this->get(route('electricity.index'));
        $response->assertOk();
    }

    /**
     * Test user can submit valid electricity entry data.
     */
    public function test_authenticated_user_can_create_electricity_entry_successfully()
    {
        $this->actingAs($this->user);

        $response = $this->post(route('electricity.store'), [
            'business_id' => $this->business->id,
            'period_month' => '2026-07-15',
            'usage_kwh' => 200.50,
            'bill_amount_idr' => 300000.00,
            'tariff_per_kwh' => 1500.00,
            'payment_method' => 'PRABAYAR',
            'notes' => 'Token beli di minimarket',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        // Verify normalization of period_month to first day of month (2026-07-01)
        $entry = ElectricityEntry::where('business_id', $this->business->id)->first();
        $this->assertNotNull($entry);
        $this->assertEquals('2026-07-01', $entry->period_month->format('Y-m-d'));
        $this->assertEquals(200.50, (float) $entry->usage_kwh);
        $this->assertEquals(300000.00, (float) $entry->bill_amount_idr);
        $this->assertEquals('Token beli di minimarket', $entry->notes);
    }

    /**
     * Test cross-tenant boundary validation.
     */
    public function test_user_cannot_create_electricity_entry_for_another_users_business()
    {
        $otherUser = User::factory()->create();
        $otherBusiness = Business::create([
            'user_id' => $otherUser->id,
            'name' => 'Other Business',
            'business_type' => 'RETAIL',
        ]);

        $this->actingAs($this->user);

        $response = $this->post(route('electricity.store'), [
            'business_id' => $otherBusiness->id,
            'period_month' => '2026-07-01',
            'usage_kwh' => 200.50,
        ]);

        $response->assertSessionHasErrors(['business_id']);
        
        $entry = ElectricityEntry::where('business_id', $otherBusiness->id)->first();
        $this->assertNull($entry);
    }

    /**
     * Test meter readings auto-calculate usage_kwh when usage_kwh is omitted.
     */
    public function test_meter_readings_auto_calculate_usage_kwh()
    {
        $this->actingAs($this->user);

        $response = $this->post(route('electricity.store'), [
            'business_id' => $this->business->id,
            'period_month' => '2026-07-01',
            'usage_kwh' => '', // omitted
            'meter_start' => 1250.00,
            'meter_end' => 1500.50,
        ]);

        $response->assertRedirect();

        $entry = ElectricityEntry::where('business_id', $this->business->id)->first();
        $this->assertNotNull($entry);
        $this->assertEquals('2026-07-01', $entry->period_month->format('Y-m-d'));
        $this->assertEquals(250.50, (float) $entry->usage_kwh);
        $this->assertEquals(1250.00, (float) $entry->meter_start);
        $this->assertEquals(1500.50, (float) $entry->meter_end);
    }

    /**
     * Test bill amount auto-estimates from usage and tariff if bill amount is omitted.
     */
    public function test_bill_amount_estimates_from_usage_and_tariff()
    {
        $this->actingAs($this->user);

        $response = $this->post(route('electricity.store'), [
            'business_id' => $this->business->id,
            'period_month' => '2026-07-01',
            'usage_kwh' => 150.00,
            'bill_amount_idr' => '', // omitted
            'tariff_per_kwh' => 1500.00,
        ]);

        $response->assertRedirect();

        $entry = ElectricityEntry::where('business_id', $this->business->id)->first();
        $this->assertNotNull($entry);
        $this->assertEquals('2026-07-01', $entry->period_month->format('Y-m-d'));
        $this->assertEquals(150.00, (float) $entry->usage_kwh);
        $this->assertEquals(225000.00, (float) $entry->bill_amount_idr);
        $this->assertEquals(1500.00, (float) $entry->tariff_per_kwh);
    }

    /**
     * Test duplicate month upserts/updates correctly.
     */
    public function test_duplicate_month_upserts_correctly()
    {
        // First entry creation
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-07-01',
            'usage_kwh' => 100.00,
            'bill_amount_idr' => 150000.00,
        ]);

        $this->actingAs($this->user);

        // Submit to same month with new values
        $response = $this->post(route('electricity.store'), [
            'business_id' => $this->business->id,
            'period_month' => '2026-07-15',
            'usage_kwh' => 180.00,
            'bill_amount_idr' => 270000.00,
            'notes' => 'Updated entry notes',
        ]);

        $response->assertRedirect();
        
        $entriesCount = ElectricityEntry::where('business_id', $this->business->id)->count();
        $this->assertEquals(1, $entriesCount); // Ensure no duplicate row was created
        
        $entry = ElectricityEntry::where('business_id', $this->business->id)->first();
        $this->assertNotNull($entry);
        $this->assertEquals('2026-07-01', $entry->period_month->format('Y-m-d'));
        $this->assertEquals(180.00, (float) $entry->usage_kwh);
        $this->assertEquals(270000.00, (float) $entry->bill_amount_idr);
        $this->assertEquals('Updated entry notes', $entry->notes);
    }
}
