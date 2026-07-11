<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\ElectricityEntry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

class MeterOcrTest extends TestCase
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
            'name' => 'Kos A',
            'business_type' => 'KOS_PROPERTY',
        ]);
    }

    /**
     * 1. OCR disabled by default.
     */
    public function test_ocr_feature_is_disabled_by_default(): void
    {
        $this->assertFalse(config('meter_ocr.enabled'));
    }

    /**
     * 2 & 3. Safe OCR config is exposed & no secrets/local paths are exposed.
     */
    public function test_ocr_config_exposed_safely(): void
    {
        $this->actingAs($this->user);

        $response = $this->get(route('electricity.index'));
        $response->assertOk();

        $response->assertInertia(fn ($page) => $page
            ->has('ocrConfig')
            ->where('ocrConfig.enabled', false)
            ->missing('ocrConfig.secret')
            ->missing('ocrConfig.api_key')
            ->missing('ocrConfig.local_path')
        );
    }

    /**
     * 4. Electricity page requires authentication.
     */
    public function test_electricity_page_requires_authentication(): void
    {
        $response = $this->get(route('electricity.index'));
        $response->assertRedirect('/login');
    }

    /**
     * 5. Active business isolation is preserved.
     */
    public function test_meter_history_is_active_business_isolated(): void
    {
        // Our active business entry
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-06-01',
            'usage_kwh' => 100,
            'meter_start' => 1000,
            'meter_end' => 1100,
        ]);

        // Other business entry
        $otherUser = User::factory()->create();
        $otherBusiness = Business::create([
            'user_id' => $otherUser->id,
            'name' => 'Kos B',
            'business_type' => 'KOS_PROPERTY',
        ]);
        ElectricityEntry::create([
            'business_id' => $otherBusiness->id,
            'period_month' => '2026-06-01',
            'usage_kwh' => 200,
            'meter_start' => 2000,
            'meter_end' => 2200,
        ]);

        $this->actingAs($this->user);
        $response = $this->get(route('electricity.index'));

        $response->assertInertia(fn ($page) => $page
            ->has('meterHistory')
            ->where('meterHistory.0.meter_end', 1100)
            ->where('meterHistory.0.period_month', '2026-06-01')
            // Assert we don't have other user's data
            ->where('meterHistory', fn ($history) => count($history) === 1)
        );
    }

    /**
     * 8, 9, 10, 12. Prior meter suggestion history case tests (January/February/March).
     */
    public function test_prior_meter_history_cases_including_january_february_march(): void
    {
        // Create January, February, March entries
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-01-01',
            'usage_kwh' => 100,
            'meter_start' => 1000,
            'meter_end' => 1100,
        ]);
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-02-01',
            'usage_kwh' => 120,
            'meter_start' => 1100,
            'meter_end' => 1220,
        ]);
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-03-01',
            'usage_kwh' => 150,
            'meter_start' => 1220,
            'meter_end' => 1370,
        ]);

        $this->actingAs($this->user);
        $response = $this->get(route('electricity.index'));

        $response->assertInertia(fn ($page) => $page
            ->has('meterHistory')
            ->where('meterHistory', function ($history) {
                // Should return all 3 entries sorted by period descending
                return count($history) === 3 &&
                       $history[0]['period_month'] === '2026-03-01' && $history[0]['meter_end'] === 1370 &&
                       $history[1]['period_month'] === '2026-02-01' && $history[1]['meter_end'] === 1220 &&
                       $history[2]['period_month'] === '2026-01-01' && $history[2]['meter_end'] === 1100;
            })
        );
    }

    /**
     * 6. Archived business receives no meter history.
     */
    public function test_archived_business_receives_no_meter_history(): void
    {
        // Archive the business
        $this->business->status = Business::STATUS_ARCHIVED;
        $this->business->save();

        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-06-01',
            'usage_kwh' => 100,
            'meter_start' => 1000,
            'meter_end' => 1100,
        ]);

        $this->actingAs($this->user);
        $response = $this->get(route('electricity.index'));

        // Since the business is archived, active business resolves to null, so no history is returned
        $response->assertInertia(fn ($page) => $page
            ->where('meterHistory', [])
        );
    }

    /**
     * 7. Foreign business receives no meter history.
     */
    public function test_foreign_business_receives_no_meter_history(): void
    {
        $otherUser = User::factory()->create();
        $otherBusiness = Business::create([
            'user_id' => $otherUser->id,
            'name' => 'Foreign',
            'business_type' => 'KOS_PROPERTY',
        ]);
        ElectricityEntry::create([
            'business_id' => $otherBusiness->id,
            'period_month' => '2026-06-01',
            'usage_kwh' => 100,
            'meter_start' => 1000,
            'meter_end' => 1100,
        ]);

        // Access index page. The foreign business is not owned, so it won't resolve as active business for this user
        $this->actingAs($this->user);
        $response = $this->get(route('electricity.index').'?business_id='.$otherBusiness->id);

        $response->assertInertia(fn ($page) => $page
            ->where('meterHistory', [])
        );
    }

    /**
     * 11. Null meter_end is ignored in meterHistory.
     */
    public function test_null_meter_end_is_ignored_in_history(): void
    {
        // Entry with null meter_end
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-06-01',
            'usage_kwh' => 100,
            'meter_start' => 1000,
            'meter_end' => null,
        ]);

        $this->actingAs($this->user);
        $response = $this->get(route('electricity.index'));

        $response->assertInertia(fn ($page) => $page
            ->where('meterHistory', [])
        );
    }

    /**
     * 13. Normal electricity save still works.
     */
    public function test_normal_electricity_save_works(): void
    {
        $this->actingAs($this->user);

        $response = $this->post(route('electricity.store'), [
            'business_id' => $this->business->id,
            'period_month' => '2026-07',
            'meter_start' => 1000,
            'meter_end' => 1150,
            'tariff_per_kwh' => 1500,
            'payment_method' => 'PRABAYAR',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('electricity_entries', [
            'business_id' => $this->business->id,
            'meter_start' => 1000,
            'meter_end' => 1150,
            'usage_kwh' => 150, // auto calculation
        ]);
    }

    /**
     * 14 & 15. meter_end >= meter_start validation and usage calculation.
     */
    public function test_meter_validation_rules(): void
    {
        $this->actingAs($this->user);

        // Attempt invalid meter_end < meter_start
        $response = $this->post(route('electricity.store'), [
            'business_id' => $this->business->id,
            'period_month' => '2026-07',
            'meter_start' => 1000,
            'meter_end' => 999, // invalid
            'tariff_per_kwh' => 1500,
            'payment_method' => 'PRABAYAR',
        ]);

        $response->assertSessionHasErrors('meter_end');
        $this->assertDatabaseMissing('electricity_entries', [
            'business_id' => $this->business->id,
        ]);
    }

    /**
     * 16. Plan limit is enforced.
     */
    public function test_plan_limit_enforcement(): void
    {
        // Under free plan, we have a limit of 3 entries.
        // Let's create 3 entries first.
        for ($i = 1; $i <= 3; $i++) {
            ElectricityEntry::create([
                'business_id' => $this->business->id,
                'period_month' => "2026-0$i-01",
                'usage_kwh' => 100,
                'meter_start' => 1000,
                'meter_end' => 1100,
            ]);
        }

        $this->actingAs($this->user);

        // 4th entry should be blocked if limit is 3
        $response = $this->post(route('electricity.store'), [
            'business_id' => $this->business->id,
            'period_month' => '2026-08',
            'meter_start' => 1100,
            'meter_end' => 1200,
            'tariff_per_kwh' => 1500,
            'payment_method' => 'PRABAYAR',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseMissing('electricity_entries', [
            'business_id' => $this->business->id,
            'period_month' => '2026-08-01',
        ]);
    }

    /**
     * 17 & 18. No OCR upload or creation endpoints.
     */
    public function test_no_ocr_server_endpoints(): void
    {
        $routes = collect(\Route::getRoutes()->getRoutes())->map(fn ($r) => $r->uri());

        $hasOcrPersistence = $routes->contains(function ($uri) {
            return str_contains(strtolower($uri), 'ocr');
        });

        $this->assertFalse($hasOcrPersistence, 'There should be no server-side OCR endpoints.');
    }
}
