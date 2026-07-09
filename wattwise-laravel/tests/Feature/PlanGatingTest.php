<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Business;
use App\Models\Subscription;
use App\Models\Appliance;
use App\Models\ElectricityEntry;
use App\Models\RevenueEntry;
use App\Services\FeatureGateService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class PlanGatingTest extends TestCase
{
    use RefreshDatabase;

    private FeatureGateService $featureGateService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->featureGateService = $this->app->make(FeatureGateService::class);
    }

    public function test_plans_page_is_protected_by_auth()
    {
        $response = $this->get('/plans');
        $response->assertRedirect('/login');
    }

    public function test_default_plan_is_free()
    {
        $user = User::create([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => bcrypt('password'),
        ]);

        $business = Business::create([
            'user_id' => $user->id,
            'name' => 'Test Business',
            'business_type' => 'KOS_PROPERTY',
            'status' => 'ACTIVE',
        ]);

        $effectivePlan = $this->featureGateService->getEffectivePlan($user, $business);

        $this->assertEquals('FREE', $effectivePlan['id']);
        $this->assertEquals('Gratis', $effectivePlan['label']);
    }

    public function test_active_trial_gives_pro_trial_plan()
    {
        $user = User::create([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => bcrypt('password'),
        ]);

        $business = Business::create([
            'user_id' => $user->id,
            'name' => 'Test Business',
            'business_type' => 'KOS_PROPERTY',
            'status' => 'ACTIVE',
        ]);

        Subscription::create([
            'user_id' => $user->id,
            'plan' => 'PRO_TRIAL',
            'status' => 'ACTIVE',
            'trial_ends_at' => Carbon::now()->addDays(30),
        ]);

        $effectivePlan = $this->featureGateService->getEffectivePlan($user, $business);

        $this->assertEquals('PRO_TRIAL', $effectivePlan['id']);
        $this->assertFalse($effectivePlan['is_expired']);
    }

    public function test_expired_trial_falls_back_to_free()
    {
        $user = User::create([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => bcrypt('password'),
        ]);

        $business = Business::create([
            'user_id' => $user->id,
            'name' => 'Test Business',
            'business_type' => 'KOS_PROPERTY',
            'status' => 'ACTIVE',
        ]);

        Subscription::create([
            'user_id' => $user->id,
            'plan' => 'PRO_TRIAL',
            'status' => 'ACTIVE',
            'trial_ends_at' => Carbon::now()->subDays(1),
        ]);

        $effectivePlan = $this->featureGateService->getEffectivePlan($user, $business);

        $this->assertEquals('FREE', $effectivePlan['id']);
        $this->assertTrue($effectivePlan['is_expired']);
    }

    public function test_free_plan_limits_appliances_to_ten()
    {
        $user = User::create([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => bcrypt('password'),
        ]);

        $business = Business::create([
            'user_id' => $user->id,
            'name' => 'Test Business',
            'business_type' => 'KOS_PROPERTY',
            'status' => 'ACTIVE',
        ]);

        // Create 10 appliances
        for ($i = 1; $i <= 10; $i++) {
            Appliance::create([
                'business_id' => $business->id,
                'name' => 'Alat ' . $i,
                'quantity' => 1,
                'watt' => 100,
                'hours_per_day' => 5,
                'days_per_month' => 30,
                'source' => 'MANUAL',
                'confidence' => 'USER_CUSTOM',
            ]);
        }

        // Try to add 11th appliance manual store
        $response = $this->actingAs($user)->post('/appliances', [
            'business_id' => $business->id,
            'name' => 'Alat Ke-11',
            'quantity' => 1,
            'watt' => 100,
            'hours_per_day' => 5,
            'days_per_month' => 30,
        ]);

        $response->assertSessionHas('error');
        $this->assertEquals(10, Appliance::where('business_id', $business->id)->count());
    }

    public function test_pro_plan_allows_more_than_ten_appliances()
    {
        $user = User::create([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => bcrypt('password'),
        ]);

        $business = Business::create([
            'user_id' => $user->id,
            'name' => 'Test Business',
            'business_type' => 'KOS_PROPERTY',
            'status' => 'ACTIVE',
        ]);

        Subscription::create([
            'user_id' => $user->id,
            'plan' => 'PRO',
            'status' => 'ACTIVE',
        ]);

        // Create 10 appliances
        for ($i = 1; $i <= 10; $i++) {
            Appliance::create([
                'business_id' => $business->id,
                'name' => 'Alat ' . $i,
                'quantity' => 1,
                'watt' => 100,
                'hours_per_day' => 5,
                'days_per_month' => 30,
                'source' => 'MANUAL',
                'confidence' => 'USER_CUSTOM',
            ]);
        }

        // Try to add 11th appliance manual store
        $response = $this->actingAs($user)->post('/appliances', [
            'business_id' => $business->id,
            'name' => 'Alat Ke-11',
            'quantity' => 1,
            'watt' => 100,
            'hours_per_day' => 5,
            'days_per_month' => 30,
        ]);

        $response->assertSessionHasNoErrors();
        $this->assertEquals(11, Appliance::where('business_id', $business->id)->count());
    }

    public function test_free_plan_limits_electricity_entries_to_three()
    {
        $user = User::create([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => bcrypt('password'),
        ]);

        $business = Business::create([
            'user_id' => $user->id,
            'name' => 'Test Business',
            'business_type' => 'KOS_PROPERTY',
            'status' => 'ACTIVE',
        ]);

        // Create 3 entries
        ElectricityEntry::create([
            'business_id' => $business->id,
            'period_month' => '2026-01-01',
            'usage_kwh' => 100,
            'bill_amount_idr' => 150000,
        ]);
        ElectricityEntry::create([
            'business_id' => $business->id,
            'period_month' => '2026-02-01',
            'usage_kwh' => 110,
            'bill_amount_idr' => 165000,
        ]);
        ElectricityEntry::create([
            'business_id' => $business->id,
            'period_month' => '2026-03-01',
            'usage_kwh' => 120,
            'bill_amount_idr' => 180000,
        ]);

        // Try to add 4th entry
        $response = $this->actingAs($user)->post('/electricity', [
            'business_id' => $business->id,
            'period_month' => '2026-04',
            'usage_kwh' => 130,
            'bill_amount_idr' => 195000,
            'payment_method' => 'PASCABAYAR',
        ]);

        $response->assertSessionHas('error');
        $this->assertEquals(3, ElectricityEntry::where('business_id', $business->id)->count());
    }

    public function test_free_plan_limits_revenue_entries_to_three()
    {
        $user = User::create([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => bcrypt('password'),
        ]);

        $business = Business::create([
            'user_id' => $user->id,
            'name' => 'Test Business',
            'business_type' => 'KOS_PROPERTY',
            'status' => 'ACTIVE',
        ]);

        // Create 3 entries
        RevenueEntry::create([
            'business_id' => $business->id,
            'period_month' => '2026-01-01',
            'revenue_amount_idr' => 5000000,
            'revenue_input_mode' => 'EXACT',
        ]);
        RevenueEntry::create([
            'business_id' => $business->id,
            'period_month' => '2026-02-01',
            'revenue_amount_idr' => 5500000,
            'revenue_input_mode' => 'EXACT',
        ]);
        RevenueEntry::create([
            'business_id' => $business->id,
            'period_month' => '2026-03-01',
            'revenue_amount_idr' => 6000000,
            'revenue_input_mode' => 'EXACT',
        ]);

        // Try to add 4th entry
        $response = $this->actingAs($user)->post('/revenue', [
            'business_id' => $business->id,
            'period_month' => '2026-04',
            'revenue_amount_idr' => 6500000,
            'revenue_input_mode' => 'EXACT',
        ]);

        $response->assertSessionHas('error');
        $this->assertEquals(3, RevenueEntry::where('business_id', $business->id)->count());
    }

    public function test_can_start_trial_once()
    {
        $user = User::create([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => bcrypt('password'),
        ]);

        $response = $this->actingAs($user)->post('/plans/trial');

        $response->assertSessionHas('success');
        $user->refresh();
        $this->assertEquals('PRO_TRIAL', $user->subscription->plan);

        // Try starting it again
        $response2 = $this->actingAs($user)->post('/plans/trial');
        $response2->assertSessionHas('error');
    }

    public function test_no_payment_integration_exists()
    {
        $files = glob(app_path('Http/Controllers/*.php'));
        foreach ($files as $file) {
            $content = file_get_contents($file);
            $this->assertStringNotContainsString('Stripe', $content);
            $this->assertStringNotContainsString('Midtrans', $content);
            $this->assertStringNotContainsString('Xendit', $content);
        }
    }
}
