<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\ElectricityEntry;
use App\Models\RevenueEntry;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ElectricityRevenueModelTest extends TestCase
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
            'name' => 'Test Business',
            'business_type' => 'LAUNDRY',
            'city' => 'Bandung',
            'province' => 'Jawa Barat',
        ]);
    }

    public function test_business_can_have_multiple_electricity_entries()
    {
        $entry1 = ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-06-01',
            'usage_kwh' => 120.50,
            'bill_amount_idr' => 180000.00,
            'meter_start' => 1000.00,
            'meter_end' => 1120.50,
            'tariff_per_kwh' => 1500.00,
            'payment_method' => 'PASCABAYAR',
        ]);

        $entry2 = ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-07-01',
            'usage_kwh' => 150.00,
            'bill_amount_idr' => 225000.00,
            'meter_start' => 1120.50,
            'meter_end' => 1270.50,
            'tariff_per_kwh' => 1500.00,
            'payment_method' => 'PASCABAYAR',
        ]);

        $this->assertCount(2, $this->business->electricityEntries);
        $this->assertInstanceOf(ElectricityEntry::class, $this->business->electricityEntries->first());
        $this->assertEquals($this->business->id, $entry1->business->id);
    }

    public function test_business_can_have_multiple_revenue_entries()
    {
        $entry1 = RevenueEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-06-01',
            'revenue_amount_idr' => 5000000.00,
            'revenue_input_mode' => 'EXACT',
        ]);

        $entry2 = RevenueEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-07-01',
            'revenue_amount_idr' => 6000000.00,
            'revenue_input_mode' => 'ESTIMATE',
        ]);

        $this->assertCount(2, $this->business->revenueEntries);
        $this->assertInstanceOf(RevenueEntry::class, $this->business->revenueEntries->first());
        $this->assertEquals($this->business->id, $entry1->business->id);
    }

    public function test_electricity_entry_composite_unique_constraint()
    {
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-07-01',
            'usage_kwh' => 100.00,
        ]);

        $this->expectException(QueryException::class);

        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-07-01',
            'usage_kwh' => 120.00,
        ]);
    }

    public function test_revenue_entry_composite_unique_constraint()
    {
        RevenueEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-07-01',
            'revenue_amount_idr' => 5000000.00,
        ]);

        $this->expectException(QueryException::class);

        RevenueEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-07-01',
            'revenue_amount_idr' => 6000000.00,
        ]);
    }

    public function test_model_casts_work_properly()
    {
        $electricity = ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-07-01',
            'usage_kwh' => 123.45,
            'bill_amount_idr' => 150000.50,
        ]);

        $this->assertInstanceOf(\Carbon\CarbonInterface::class, $electricity->period_month);
        $this->assertEquals('2026-07-01', $electricity->period_month->format('Y-m-d'));
        
        // Eloquent cast to decimal:2 outputs numeric string (or float depending on driver, casting ensures accurate representation)
        $this->assertEquals('123.45', (string) $electricity->usage_kwh);
        $this->assertEquals('150000.50', (string) $electricity->bill_amount_idr);
    }
}
