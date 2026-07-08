<?php

namespace Tests\Feature;

use App\Models\Appliance;
use App\Models\Business;
use App\Models\User;
use App\Services\Appliances\ApplianceEstimator;
use App\Services\Appliances\ApplianceTemplateService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApplianceTemplateServiceTest extends TestCase
{
    use RefreshDatabase;

    private ApplianceTemplateService $service;
    private User $user;
    private Business $business;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new ApplianceTemplateService(new ApplianceEstimator());
        $this->user = User::factory()->create();
        $this->business = Business::create([
            'user_id' => $this->user->id,
            'name' => 'Kos Melati',
            'business_type' => 'KOS_PROPERTY',
        ]);
    }

    /**
     * Test that KOS_PROPERTY template returns the expected appliances.
     */
    public function test_gets_kos_property_template(): void
    {
        $items = $this->service->getTemplateForBusinessType('KOS_PROPERTY');

        $this->assertNotEmpty($items);

        // All spec items must be present
        $names = array_column($items, 'name');
        $this->assertContains('AC kamar', $names);
        $this->assertContains('Kipas angin', $names);
        $this->assertContains('Lampu kamar', $names);
        $this->assertContains('Lampu koridor', $names);
        $this->assertContains('Pompa air', $names);
        $this->assertContains('Rice cooker / magic com', $names);
        $this->assertContains('Kulkas', $names);
        $this->assertContains('Router WiFi', $names);
        $this->assertContains('CCTV', $names);
        $this->assertContains('Water heater', $names);

        // Each item has all required template fields
        foreach ($items as $item) {
            $this->assertArrayHasKey('key', $item);
            $this->assertArrayHasKey('category', $item);
            $this->assertArrayHasKey('name', $item);
            $this->assertArrayHasKey('aliases', $item);
            $this->assertArrayHasKey('default_watt', $item);
            $this->assertArrayHasKey('min_watt', $item);
            $this->assertArrayHasKey('max_watt', $item);
            $this->assertArrayHasKey('default_quantity', $item);
            $this->assertArrayHasKey('default_hours_per_day', $item);
            $this->assertArrayHasKey('default_days_per_month', $item);
            $this->assertArrayHasKey('usage_note', $item);
            $this->assertArrayHasKey('confidence', $item);
            $this->assertArrayHasKey('can_customize', $item);
        }
    }

    /**
     * Test that an unknown business type falls back to OTHER.
     */
    public function test_gets_other_fallback_for_unknown_type(): void
    {
        $items = $this->service->getTemplateForBusinessType('UNKNOWN_TYPE');
        $otherItems = $this->service->getTemplateForBusinessType('OTHER');

        $this->assertEquals($otherItems, $items);
        $this->assertNotEmpty($items);

        $names = array_column($items, 'name');
        $this->assertContains('Lampu', $names);
        $this->assertContains('Kipas angin', $names);
        $this->assertContains('Pompa air', $names);
        $this->assertContains('Router WiFi', $names);
    }

    /**
     * Test that applying template creates appliance rows for the business.
     */
    public function test_applies_template_to_business(): void
    {
        $result = $this->service->applyTemplateToBusiness($this->business);

        // All KOS_PROPERTY items created
        $templateCount = count($this->service->getTemplateForBusinessType('KOS_PROPERTY'));
        $this->assertEquals($templateCount, $result['created_count']);
        $this->assertEquals(0, $result['skipped_count']);
        $this->assertEmpty($result['skipped_names']);
        $this->assertCount($templateCount, $result['created_names']);

        // Verify rows exist in the database
        $this->assertDatabaseCount('appliances', $templateCount);

        $first = Appliance::where('business_id', $this->business->id)->first();
        $this->assertEquals('TEMPLATE', $first->source);
        $this->assertNotNull($first->category);
    }

    /**
     * Test that apply-template skips duplicates.
     */
    public function test_skips_duplicates(): void
    {
        // Pre-create an appliance whose normalised name matches a template item
        Appliance::create([
            'business_id' => $this->business->id,
            'name' => 'ac kamar',  // matches "AC kamar" after normalisation
            'source' => 'MANUAL',
            'confidence' => 'USER_CUSTOM',
        ]);

        $result = $this->service->applyTemplateToBusiness($this->business);

        $this->assertGreaterThan(0, $result['skipped_count']);
        $this->assertContains('AC kamar', $result['skipped_names']);

        // Total appliances = 1 (manual) + created_count (template)
        $this->assertEquals(
            1 + $result['created_count'],
            Appliance::where('business_id', $this->business->id)->count()
        );
    }

    /**
     * Test that template-created appliances can be updated by normal model update.
     */
    public function test_created_appliances_remain_editable(): void
    {
        $this->service->applyTemplateToBusiness($this->business);

        $appliance = Appliance::where('business_id', $this->business->id)->first();

        // User can freely edit watt, quantity, hours, etc.
        $appliance->update([
            'watt' => 999.99,
            'quantity' => 5,
            'hours_per_day' => 12.00,
            'days_per_month' => 25,
            'notes' => 'Edited by user',
        ]);

        $appliance->refresh();

        $this->assertEquals('999.99', $appliance->watt);
        $this->assertEquals(5, $appliance->quantity);
        $this->assertEquals('12.00', $appliance->hours_per_day);
        $this->assertEquals(25, $appliance->days_per_month);
        $this->assertEquals('Edited by user', $appliance->notes);
        // source stays TEMPLATE; confidence stays original
        $this->assertEquals('TEMPLATE', $appliance->source);
    }

    /**
     * Test segment label resolution.
     */
    public function test_segment_labels(): void
    {
        $this->assertEquals('Kos-kosan & Properti Sewa', $this->service->getSegmentLabel('KOS_PROPERTY'));
        $this->assertEquals('Restoran, Kafe, Warung Makan', $this->service->getSegmentLabel('FNB'));
        $this->assertEquals('Jasa Cuci / Laundry', $this->service->getSegmentLabel('LAUNDRY'));
        $this->assertEquals('Toko Kelontong & Minimarket', $this->service->getSegmentLabel('RETAIL'));
        $this->assertEquals('Penyimpanan Dingin / Frozen Food', $this->service->getSegmentLabel('COLD_STORAGE'));
        $this->assertEquals('Usaha Lainnya', $this->service->getSegmentLabel('OTHER'));
        // Unknown falls back to OTHER
        $this->assertEquals('Usaha Lainnya', $this->service->getSegmentLabel('UNKNOWN'));
    }

    /**
     * Test that applying template twice does not create duplicates.
     */
    public function test_applying_template_twice_does_not_duplicate(): void
    {
        $first = $this->service->applyTemplateToBusiness($this->business);
        $second = $this->service->applyTemplateToBusiness($this->business);

        $this->assertGreaterThan(0, $first['created_count']);
        $this->assertEquals(0, $second['created_count']);
        $this->assertEquals($first['created_count'], $second['skipped_count']);

        $this->assertEquals(
            $first['created_count'],
            Appliance::where('business_id', $this->business->id)->count()
        );
    }
}
