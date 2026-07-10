<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\ElectricityEntry;
use App\Models\ElectricityProfile;
use App\Models\User;
use App\Services\Predictions\PredictionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PredictionServiceBusinessTest extends TestCase
{
    use RefreshDatabase;

    private function makeBusiness(?float $profileTariff = 1444.70): Business
    {
        $user = User::factory()->create();

        $business = Business::create([
            'user_id' => $user->id,
            'name' => 'Kos A',
            'business_type' => 'KOS_PROPERTY',
            'status' => 'ACTIVE',
        ]);

        if ($profileTariff !== null) {
            ElectricityProfile::create([
                'business_id' => $business->id,
                'tariff_per_kwh' => $profileTariff,
            ]);
        }

        return $business;
    }

    private function seedEntries(Business $business, array $periodUsage): void
    {
        foreach ($periodUsage as $period => $usage) {
            ElectricityEntry::create([
                'business_id' => $business->id,
                'period_month' => $period . '-01',
                'usage_kwh' => $usage,
                // No bill_amount_idr on purpose — exercise tariff-based estimation.
            ]);
        }
    }

    public function test_predict_for_business_loads_history_and_resolves_profile_tariff(): void
    {
        $business = $this->makeBusiness(1444.70);
        $this->seedEntries($business, [
            '2026-01' => 800,
            '2026-02' => 810,
            '2026-03' => 830,
        ]);

        $result = app(PredictionService::class)->predictForBusiness($business);

        $this->assertTrue($result['has_prediction']);
        $this->assertSame(PredictionService::METHOD_HYBRID, $result['method_label']);
        $this->assertSame(3, $result['data_requirements']['history_months']);
        $this->assertTrue($result['data_requirements']['has_tariff']);
        $this->assertNotNull($result['estimated_bill_idr']); // resolved from electricity profile
        $this->assertNotNull($result['predicted_usage_kwh']);
    }

    public function test_predict_for_business_without_entries_returns_no_prediction(): void
    {
        $business = $this->makeBusiness();

        $result = app(PredictionService::class)->predictForBusiness($business);

        $this->assertFalse($result['has_prediction']);
        $this->assertNull($result['predicted_usage_kwh']);
        $this->assertSame(0, $result['data_requirements']['history_months']);
    }

    public function test_predict_for_business_can_lock_detailed_analysis(): void
    {
        $business = $this->makeBusiness();
        $this->seedEntries($business, [
            '2026-01' => 500,
            '2026-02' => 900,
            '2026-03' => 1300,
        ]);

        $locked = app(PredictionService::class)->predictForBusiness($business, false);

        $this->assertTrue($locked['is_detailed_analysis_locked']);
        $this->assertSame([], $locked['possible_causes']);
        $this->assertNotNull($locked['predicted_usage_kwh']); // summary still available
    }
}
