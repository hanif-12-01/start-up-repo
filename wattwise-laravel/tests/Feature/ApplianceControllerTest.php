<?php

namespace Tests\Feature;

use App\Models\Appliance;
use App\Models\Business;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApplianceControllerTest extends TestCase
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
     * Test guests are redirected from appliances page.
     */
    public function test_guest_redirected_from_appliances(): void
    {
        $this->get(route('appliances.index'))->assertRedirect(route('login'));
        $this->post(route('appliances.store'))->assertRedirect(route('login'));
        $this->post(route('appliances.apply-template'))->assertRedirect(route('login'));
    }

    /**
     * Test authenticated user can view appliances page.
     */
    public function test_authenticated_user_can_view_appliances_page(): void
    {
        $this->actingAs($this->user);

        $response = $this->get(route('appliances.index'));
        $response->assertOk();
    }

    /**
     * Test user can create appliance for own business.
     */
    public function test_user_can_create_appliance(): void
    {
        $this->actingAs($this->user);

        $response = $this->post(route('appliances.store'), [
            'business_id' => $this->business->id,
            'name' => 'AC Kamar',
            'category' => 'Pendingin',
            'watt' => 450,
            'quantity' => 2,
            'hours_per_day' => 8,
            'days_per_month' => 30,
            'notes' => 'Daikin 1/2 PK',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('appliances', [
            'business_id' => $this->business->id,
            'name' => 'AC Kamar',
            'category' => 'Pendingin',
            'watt' => '450.00',
            'quantity' => 2,
            'source' => 'MANUAL',
            'confidence' => 'USER_CUSTOM',
        ]);
    }

    /**
     * Test user can update own appliance.
     */
    public function test_user_can_update_own_appliance(): void
    {
        $this->actingAs($this->user);

        $appliance = Appliance::create([
            'business_id' => $this->business->id,
            'name' => 'Kulkas',
            'watt' => 100,
            'quantity' => 1,
            'hours_per_day' => 24,
            'days_per_month' => 30,
            'source' => 'MANUAL',
            'confidence' => 'USER_CUSTOM',
        ]);

        $response = $this->put(route('appliances.update', $appliance), [
            'name' => 'Kulkas 2 Pintu',
            'watt' => 150,
            'quantity' => 1,
            'hours_per_day' => 24,
            'days_per_month' => 30,
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $appliance->refresh();
        $this->assertEquals('Kulkas 2 Pintu', $appliance->name);
        $this->assertEquals('150.00', $appliance->watt);
    }

    /**
     * Test user can delete own appliance.
     */
    public function test_user_can_delete_own_appliance(): void
    {
        $this->actingAs($this->user);

        $appliance = Appliance::create([
            'business_id' => $this->business->id,
            'name' => 'Setrika',
            'quantity' => 1,
            'source' => 'MANUAL',
            'confidence' => 'USER_CUSTOM',
        ]);

        $response = $this->delete(route('appliances.destroy', $appliance));

        $response->assertRedirect();
        $this->assertDatabaseMissing('appliances', ['id' => $appliance->id]);
    }

    /**
     * Test user cannot create appliance for another user's business.
     */
    public function test_user_cannot_create_appliance_for_another_user(): void
    {
        $otherUser = User::factory()->create();
        $otherBusiness = Business::create([
            'user_id' => $otherUser->id,
            'name' => 'Laundry Bersih',
            'business_type' => 'LAUNDRY',
        ]);

        $this->actingAs($this->user);

        $response = $this->post(route('appliances.store'), [
            'business_id' => $otherBusiness->id,
            'name' => 'Mesin Cuci',
            'quantity' => 1,
        ]);

        $response->assertSessionHasErrors('business_id');
        $this->assertDatabaseCount('appliances', 0);
    }

    /**
     * Test user cannot update another user's appliance.
     */
    public function test_user_cannot_update_another_users_appliance(): void
    {
        $otherUser = User::factory()->create();
        $otherBusiness = Business::create([
            'user_id' => $otherUser->id,
            'name' => 'Warung Makan',
            'business_type' => 'FNB',
        ]);

        $appliance = Appliance::create([
            'business_id' => $otherBusiness->id,
            'name' => 'Kompor Listrik',
            'watt' => 1500,
            'quantity' => 1,
            'source' => 'MANUAL',
            'confidence' => 'USER_CUSTOM',
        ]);

        $this->actingAs($this->user);

        $response = $this->put(route('appliances.update', $appliance), [
            'name' => 'Kompor Listrik Besar',
            'quantity' => 1,
        ]);

        $response->assertForbidden();

        $appliance->refresh();
        $this->assertEquals('Kompor Listrik', $appliance->name);
    }

    /**
     * Test user cannot delete another user's appliance.
     */
    public function test_user_cannot_delete_another_users_appliance(): void
    {
        $otherUser = User::factory()->create();
        $otherBusiness = Business::create([
            'user_id' => $otherUser->id,
            'name' => 'Toko Ritel',
            'business_type' => 'RETAIL',
        ]);

        $appliance = Appliance::create([
            'business_id' => $otherBusiness->id,
            'name' => 'Mesin Kasir',
            'quantity' => 1,
            'source' => 'MANUAL',
            'confidence' => 'USER_CUSTOM',
        ]);

        $this->actingAs($this->user);

        $response = $this->delete(route('appliances.destroy', $appliance));
        $response->assertForbidden();

        $this->assertDatabaseHas('appliances', ['id' => $appliance->id]);
    }

    /**
     * Test validation rejects invalid data.
     */
    public function test_validation_rejects_invalid_data(): void
    {
        $this->actingAs($this->user);

        $response = $this->post(route('appliances.store'), [
            'business_id' => $this->business->id,
            'name' => '',
            'quantity' => 0,
            'watt' => -10,
            'hours_per_day' => 25,
            'days_per_month' => 32,
        ]);

        $response->assertSessionHasErrors(['name', 'quantity', 'watt', 'hours_per_day', 'days_per_month']);
    }

    /**
     * Test POST /appliances/apply-template applies template.
     */
    public function test_user_can_apply_template(): void
    {
        $this->actingAs($this->user);

        $response = $this->post(route('appliances.apply-template'), [
            'business_id' => $this->business->id,
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        // Verify that appliances are created
        $this->assertGreaterThan(0, $this->business->appliances()->count());
    }

    /**
     * Test duplicate apply skips existing similar appliances.
     */
    public function test_duplicate_apply_skips_existing_appliances(): void
    {
        $this->actingAs($this->user);

        // Pre-create an appliance that matches one in KOS_PROPERTY template
        Appliance::create([
            'business_id' => $this->business->id,
            'name' => 'AC kamar',
            'quantity' => 1,
            'source' => 'MANUAL',
            'confidence' => 'USER_CUSTOM',
        ]);

        $initialCount = $this->business->appliances()->count(); // 1
        $this->assertEquals(1, $initialCount);

        // Apply template first time
        $response = $this->post(route('appliances.apply-template'), [
            'business_id' => $this->business->id,
        ]);
        $response->assertRedirect();

        $countAfterFirstApply = $this->business->appliances()->count();
        $this->assertGreaterThan(1, $countAfterFirstApply);

        // Apply template second time (all should be skipped/no new items added)
        $response = $this->post(route('appliances.apply-template'), [
            'business_id' => $this->business->id,
        ]);
        $response->assertRedirect();
        $response->assertSessionHas('success', 'Beberapa alat sudah ada, jadi tidak ditambahkan ulang.');

        $this->assertEquals($countAfterFirstApply, $this->business->appliances()->count());
    }

    /**
     * Test applying template does not affect another user's business data.
     */
    public function test_apply_template_does_not_affect_other_users_data(): void
    {
        $otherUser = User::factory()->create();
        $otherBusiness = Business::create([
            'user_id' => $otherUser->id,
            'name' => 'Other Biz',
            'business_type' => 'LAUNDRY',
        ]);

        $this->actingAs($this->user);

        // Apply template for our business
        $response = $this->post(route('appliances.apply-template'), [
            'business_id' => $this->business->id,
        ]);
        $response->assertRedirect();

        // Verify other user's business remains empty
        $this->assertEquals(0, $otherBusiness->appliances()->count());
    }

    /**
     * Test GET /appliances index action returns computed estimations.
     */
    public function test_index_includes_computed_estimations(): void
    {
        $this->actingAs($this->user);

        // Pre-create some appliances
        Appliance::create([
            'business_id' => $this->business->id,
            'name' => 'AC kamar',
            'watt' => 350,
            'quantity' => 2,
            'hours_per_day' => 8,
            'days_per_month' => 30,
            'source' => 'MANUAL',
            'confidence' => 'USER_CUSTOM',
        ]);

        // Create tariff profile
        $this->business->electricityProfile()->create([
            'tariff_per_kwh' => 1500.00,
            'power_va' => 1300,
            'customer_type' => 'R1',
        ]);

        $response = $this->get(route('appliances.index'));
        $response->assertOk();

        $inertiaData = $response->original->getData();
        $appliances = $inertiaData['page']['props']['appliances'];

        $this->assertNotEmpty($appliances);
        $ac = collect($appliances)->firstWhere('name', 'AC kamar');
        
        $this->assertNotNull($ac);
        $this->assertEquals(168.0, $ac['estimated_monthly_kwh']);
        $this->assertEquals(252000.0, $ac['estimated_monthly_cost']);
        $this->assertEquals('Daya besar', $ac['ranking_reason']);
        $this->assertEquals(31500.0, $ac['potential_saving']);
    }
}
