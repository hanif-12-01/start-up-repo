<?php

namespace Tests\Feature;

use App\Models\Appliance;
use App\Models\Business;
use App\Models\ElectricityEntry;
use App\Models\RevenueEntry;
use App\Models\Subscription;
use App\Models\User;
use App\Services\FeatureGateService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class PlanGatingRegressionTest extends TestCase
{
    use RefreshDatabase;

    private FeatureGateService $featureGateService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->featureGateService = $this->app->make(FeatureGateService::class);
    }

    /**
     * 1. Test default user without subscription resolves FREE.
     */
    public function test_default_user_without_subscription_resolves_free(): void
    {
        $user = User::factory()->create();
        $plan = $this->featureGateService->getEffectivePlan($user);

        $this->assertEquals('FREE', $plan['id']);
        $this->assertEquals('Gratis', $plan['label']);
        $this->assertFalse($plan['is_trial']);
        $this->assertFalse($plan['is_expired']);
    }

    /**
     * 2. Test active Pro Trial resolves PRO_TRIAL or Pro-like access.
     */
    public function test_active_pro_trial_resolves_pro_trial(): void
    {
        $user = User::factory()->create();
        Subscription::create([
            'user_id' => $user->id,
            'plan' => 'PRO_TRIAL',
            'status' => 'ACTIVE',
            'trial_ends_at' => Carbon::now()->addDays(15),
        ]);

        $plan = $this->featureGateService->getEffectivePlan($user);

        $this->assertEquals('PRO_TRIAL', $plan['id']);
        $this->assertEquals('Pro Trial', $plan['label']);
        $this->assertTrue($plan['is_trial']);
        $this->assertFalse($plan['is_expired']);
    }

    /**
     * 3. Test expired Pro Trial falls back to FREE.
     */
    public function test_expired_pro_trial_falls_back_to_free(): void
    {
        $user = User::factory()->create();
        Subscription::create([
            'user_id' => $user->id,
            'plan' => 'PRO_TRIAL',
            'status' => 'ACTIVE',
            'trial_ends_at' => Carbon::now()->subDays(1),
        ]);

        $plan = $this->featureGateService->getEffectivePlan($user);

        $this->assertEquals('FREE', $plan['id']);
        $this->assertEquals('Gratis', $plan['label']);
        $this->assertTrue($plan['is_trial']); // Originally a trial
        $this->assertTrue($plan['is_expired']); // Expired
    }

    /**
     * 4. Test starting trial twice does not create duplicate active trial.
     */
    public function test_starting_trial_twice_does_not_create_duplicate_active_trial(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        // Start first trial
        $response1 = $this->post(route('plans.trial'));
        $response1->assertRedirect();
        $response1->assertSessionHas('success');

        $this->assertEquals(1, Subscription::where('user_id', $user->id)->count());

        $user->refresh();
        $this->actingAs($user);

        // Attempt to start second trial
        $response2 = $this->post(route('plans.trial'));
        $response2->assertRedirect();
        $response2->assertSessionHas('error');

        $this->assertEquals(1, Subscription::where('user_id', $user->id)->count());
        $this->assertEquals('PRO_TRIAL', $user->subscription->plan);
    }

    /**
     * 5. Test Free appliance limit blocks 11th appliance.
     */
    public function test_free_appliance_limit_blocks_eleventh_appliance(): void
    {
        $user = User::factory()->create();
        $business = Business::create([
            'user_id' => $user->id,
            'name' => 'Kos A',
            'business_type' => 'KOS_PROPERTY',
        ]);

        // Put 10 appliances in DB
        for ($i = 1; $i <= 10; $i++) {
            Appliance::create([
                'business_id' => $business->id,
                'name' => "Alat $i",
                'quantity' => 1,
                'watt' => 100,
                'source' => 'MANUAL',
                'confidence' => 'USER_CUSTOM',
            ]);
        }

        $this->actingAs($user);

        // Try to add the 11th appliance
        $response = $this->post(route('appliances.store'), [
            'business_id' => $business->id,
            'name' => 'Alat 11',
            'quantity' => 1,
            'watt' => 100,
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('error');
        $this->assertEquals(10, Appliance::where('business_id', $business->id)->count());
    }

    /**
     * 6. Test Pro user can exceed Free appliance limit.
     */
    public function test_pro_user_can_exceed_free_appliance_limit(): void
    {
        $user = User::factory()->create();
        Subscription::create([
            'user_id' => $user->id,
            'plan' => 'PRO',
            'status' => 'ACTIVE',
        ]);
        $business = Business::create([
            'user_id' => $user->id,
            'name' => 'Kos A',
            'business_type' => 'KOS_PROPERTY',
        ]);

        // Put 10 appliances in DB
        for ($i = 1; $i <= 10; $i++) {
            Appliance::create([
                'business_id' => $business->id,
                'name' => "Alat $i",
                'quantity' => 1,
                'watt' => 100,
                'source' => 'MANUAL',
                'confidence' => 'USER_CUSTOM',
            ]);
        }

        $this->actingAs($user);

        // Try to add the 11th appliance
        $response = $this->post(route('appliances.store'), [
            'business_id' => $business->id,
            'name' => 'Alat 11',
            'quantity' => 1,
            'watt' => 100,
        ]);

        $response->assertRedirect();
        $response->assertSessionHasNoErrors();
        $this->assertEquals(11, Appliance::where('business_id', $business->id)->count());
    }

    /**
     * 7. Test Free electricity entry limit blocks 4th month.
     */
    public function test_free_electricity_entry_limit_blocks_fourth_month(): void
    {
        $user = User::factory()->create();
        $business = Business::create([
            'user_id' => $user->id,
            'name' => 'Kos A',
            'business_type' => 'KOS_PROPERTY',
        ]);

        // Add 3 electricity entries
        ElectricityEntry::create(['business_id' => $business->id, 'period_month' => '2026-01-01', 'usage_kwh' => 100]);
        ElectricityEntry::create(['business_id' => $business->id, 'period_month' => '2026-02-01', 'usage_kwh' => 100]);
        ElectricityEntry::create(['business_id' => $business->id, 'period_month' => '2026-03-01', 'usage_kwh' => 100]);

        $this->actingAs($user);

        // Try to add the 4th entry
        $response = $this->post(route('electricity.store'), [
            'business_id' => $business->id,
            'period_month' => '2026-04-01',
            'usage_kwh' => 100,
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('error');
        $this->assertEquals(3, ElectricityEntry::where('business_id', $business->id)->count());
    }

    /**
     * 8. Test Pro user can exceed electricity entry limit.
     */
    public function test_pro_user_can_exceed_electricity_entry_limit(): void
    {
        $user = User::factory()->create();
        Subscription::create([
            'user_id' => $user->id,
            'plan' => 'PRO',
            'status' => 'ACTIVE',
        ]);
        $business = Business::create([
            'user_id' => $user->id,
            'name' => 'Kos A',
            'business_type' => 'KOS_PROPERTY',
        ]);

        // Add 3 electricity entries
        ElectricityEntry::create(['business_id' => $business->id, 'period_month' => '2026-01-01', 'usage_kwh' => 100]);
        ElectricityEntry::create(['business_id' => $business->id, 'period_month' => '2026-02-01', 'usage_kwh' => 100]);
        ElectricityEntry::create(['business_id' => $business->id, 'period_month' => '2026-03-01', 'usage_kwh' => 100]);

        $this->actingAs($user);

        // Try to add the 4th entry
        $response = $this->post(route('electricity.store'), [
            'business_id' => $business->id,
            'period_month' => '2026-04-01',
            'usage_kwh' => 100,
        ]);

        $response->assertRedirect();
        $response->assertSessionHasNoErrors();
        $this->assertEquals(4, ElectricityEntry::where('business_id', $business->id)->count());
    }

    /**
     * 9. Test Free revenue entry limit blocks 4th month.
     */
    public function test_free_revenue_entry_limit_blocks_fourth_month(): void
    {
        $user = User::factory()->create();
        $business = Business::create([
            'user_id' => $user->id,
            'name' => 'Kos A',
            'business_type' => 'KOS_PROPERTY',
        ]);

        // Add 3 revenue entries
        RevenueEntry::create(['business_id' => $business->id, 'period_month' => '2026-01-01', 'revenue_amount_idr' => 1000, 'revenue_input_mode' => 'EXACT']);
        RevenueEntry::create(['business_id' => $business->id, 'period_month' => '2026-02-01', 'revenue_amount_idr' => 1000, 'revenue_input_mode' => 'EXACT']);
        RevenueEntry::create(['business_id' => $business->id, 'period_month' => '2026-03-01', 'revenue_amount_idr' => 1000, 'revenue_input_mode' => 'EXACT']);

        $this->actingAs($user);

        // Try to add the 4th entry
        $response = $this->post(route('revenue.store'), [
            'business_id' => $business->id,
            'period_month' => '2026-04-01',
            'revenue_amount_idr' => 1000,
            'revenue_input_mode' => 'EXACT',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('error');
        $this->assertEquals(3, RevenueEntry::where('business_id', $business->id)->count());
    }

    /**
     * 10. Test Pro user can exceed revenue entry limit.
     */
    public function test_pro_user_can_exceed_revenue_entry_limit(): void
    {
        $user = User::factory()->create();
        Subscription::create([
            'user_id' => $user->id,
            'plan' => 'PRO',
            'status' => 'ACTIVE',
        ]);
        $business = Business::create([
            'user_id' => $user->id,
            'name' => 'Kos A',
            'business_type' => 'KOS_PROPERTY',
        ]);

        // Add 3 revenue entries
        RevenueEntry::create(['business_id' => $business->id, 'period_month' => '2026-01-01', 'revenue_amount_idr' => 1000, 'revenue_input_mode' => 'EXACT']);
        RevenueEntry::create(['business_id' => $business->id, 'period_month' => '2026-02-01', 'revenue_amount_idr' => 1000, 'revenue_input_mode' => 'EXACT']);
        RevenueEntry::create(['business_id' => $business->id, 'period_month' => '2026-03-01', 'revenue_amount_idr' => 1000, 'revenue_input_mode' => 'EXACT']);

        $this->actingAs($user);

        // Try to add the 4th entry
        $response = $this->post(route('revenue.store'), [
            'business_id' => $business->id,
            'period_month' => '2026-04-01',
            'revenue_amount_idr' => 1000,
            'revenue_input_mode' => 'EXACT',
        ]);

        $response->assertRedirect();
        $response->assertSessionHasNoErrors();
        $this->assertEquals(4, RevenueEntry::where('business_id', $business->id)->count());
    }

    /**
     * 11. Test Free recommendations lock or limit after top 3.
     */
    public function test_free_recommendations_lock_or_limit_after_top_three(): void
    {
        $user = User::factory()->create();
        $business = Business::create([
            'user_id' => $user->id,
            'name' => 'Kos A',
            'business_type' => 'KOS_PROPERTY',
        ]);

        // Add many appliances to trigger 4+ recommendations
        for ($i = 1; $i <= 5; $i++) {
            Appliance::create([
                'business_id' => $business->id,
                'name' => "Alat berat $i",
                'quantity' => 1,
                'watt' => 1500 + ($i * 100),
                'hours_per_day' => 12,
                'days_per_month' => 30,
                'source' => 'MANUAL',
                'confidence' => 'USER_CUSTOM',
            ]);
        }

        $this->actingAs($user);

        $response = $this->get(route('recommendations.index'));
        $response->assertOk();

        $inertiaData = $response->original->getData();
        $recs = $inertiaData['page']['props']['recommendations'];

        $this->assertGreaterThan(3, count($recs));

        // Items after index 2 (4th item onwards) should be locked
        $this->assertFalse($recs[0]['is_locked']);
        $this->assertFalse($recs[1]['is_locked']);
        $this->assertFalse($recs[2]['is_locked']);
        $this->assertTrue($recs[3]['is_locked']);
        $this->assertEquals('Rekomendasi Hemat Tambahan', $recs[3]['title']);
    }

    /**
     * 12. Test Pro/Trial recommendations are not locked after top 3.
     */
    public function test_pro_recommendations_are_not_locked_after_top_three(): void
    {
        $user = User::factory()->create();
        Subscription::create([
            'user_id' => $user->id,
            'plan' => 'PRO_TRIAL',
            'status' => 'ACTIVE',
            'trial_ends_at' => Carbon::now()->addDays(30),
        ]);
        $business = Business::create([
            'user_id' => $user->id,
            'name' => 'Kos A',
            'business_type' => 'KOS_PROPERTY',
        ]);

        for ($i = 1; $i <= 5; $i++) {
            Appliance::create([
                'business_id' => $business->id,
                'name' => "Alat berat $i",
                'quantity' => 1,
                'watt' => 1500 + ($i * 100),
                'hours_per_day' => 12,
                'days_per_month' => 30,
                'source' => 'MANUAL',
                'confidence' => 'USER_CUSTOM',
            ]);
        }

        $this->actingAs($user);

        $response = $this->get(route('recommendations.index'));
        $response->assertOk();

        $inertiaData = $response->original->getData();
        $recs = $inertiaData['page']['props']['recommendations'];

        $this->assertGreaterThan(3, count($recs));

        // Assert no locked recommendations
        foreach ($recs as $rec) {
            $this->assertFalse($rec['is_locked']);
            $this->assertNotEquals('Rekomendasi Hemat Tambahan', $rec['title']);
        }
    }

    /**
     * 13. Test Free older report access is limited/redacted.
     */
    public function test_free_older_report_access_is_limited(): void
    {
        $user = User::factory()->create();
        $business = Business::create([
            'user_id' => $user->id,
            'name' => 'Kos A',
            'business_type' => 'KOS_PROPERTY',
        ]);

        // Add older and newer electricity entries
        ElectricityEntry::create(['business_id' => $business->id, 'period_month' => '2026-05-01', 'usage_kwh' => 200, 'bill_amount_idr' => 300000]);
        ElectricityEntry::create(['business_id' => $business->id, 'period_month' => '2026-06-01', 'usage_kwh' => 250, 'bill_amount_idr' => 350000]);

        $this->actingAs($user);

        // Access older month (May 2026) - should be locked
        $response = $this->get(route('reports.index', ['month' => '2026-05']));
        $response->assertOk();

        $inertiaData = $response->original->getData();
        $this->assertTrue($inertiaData['page']['props']['isLocked']);
        $this->assertNull($inertiaData['page']['props']['report']['electricity']['bill_amount']);
        $this->assertEquals('Akses Terbatas', $inertiaData['page']['props']['report']['efficiency_score']['label']);
    }

    /**
     * 14. Test Pro/Trial older report access is allowed/fully accessible.
     */
    public function test_pro_older_report_access_is_allowed(): void
    {
        $user = User::factory()->create();
        Subscription::create([
            'user_id' => $user->id,
            'plan' => 'PRO_TRIAL',
            'status' => 'ACTIVE',
            'trial_ends_at' => Carbon::now()->addDays(30),
        ]);
        $business = Business::create([
            'user_id' => $user->id,
            'name' => 'Kos A',
            'business_type' => 'KOS_PROPERTY',
        ]);

        ElectricityEntry::create(['business_id' => $business->id, 'period_month' => '2026-05-01', 'usage_kwh' => 200, 'bill_amount_idr' => 300000]);
        ElectricityEntry::create(['business_id' => $business->id, 'period_month' => '2026-06-01', 'usage_kwh' => 250, 'bill_amount_idr' => 350000]);

        $this->actingAs($user);

        // Access older month (May 2026) - should not be locked
        $response = $this->get(route('reports.index', ['month' => '2026-05']));
        $response->assertOk();

        $inertiaData = $response->original->getData();
        $this->assertFalse($inertiaData['page']['props']['isLocked']);
        $this->assertEquals(300000.0, (float) $inertiaData['page']['props']['report']['electricity']['bill_amount']);
    }

    /**
     * 15. Test FeatureGateService usage does not include another user's business data.
     */
    public function test_feature_gate_service_usage_does_not_include_another_users_business_data(): void
    {
        $userA = User::factory()->create();
        $businessA = Business::create(['user_id' => $userA->id, 'name' => 'Kos A', 'business_type' => 'KOS_PROPERTY']);

        $userB = User::factory()->create();
        $businessB = Business::create(['user_id' => $userB->id, 'name' => 'Kos B', 'business_type' => 'KOS_PROPERTY']);

        // User B has 2 appliances
        Appliance::create(['business_id' => $businessB->id, 'name' => 'Alat B1', 'quantity' => 1]);
        Appliance::create(['business_id' => $businessB->id, 'name' => 'Alat B2', 'quantity' => 1]);

        // User A has 1 appliance
        Appliance::create(['business_id' => $businessA->id, 'name' => 'Alat A1', 'quantity' => 1]);

        $usageA = $this->featureGateService->usage($userA, 'appliances.manage', $businessA);
        $this->assertEquals(1, $usageA);
    }

    /**
     * 16. Test forbidden scopes (real payment providers, external integrations)
     * are not present in controller files.
     *
     * The sandbox billing feature is simulation-only, so its domain terms
     * ("checkout", "invoice") are allowed inside BillingController but must not
     * leak into any other controller. Real payment providers and external
     * integrations remain banned everywhere — including BillingController.
     */
    public function test_forbidden_scope_check(): void
    {
        // Never permitted in ANY controller, including the billing controller.
        $alwaysForbidden = [
            'Stripe', 'Midtrans', 'Xendit', 'PayPal',
            'webhook', 'OCR', 'IoT', 'LSTM', 'live scraping', 'Gemini', 'OpenAI',
        ];

        // Only legitimate inside the authorized sandbox billing controller.
        $billingOnlyKeywords = ['checkout', 'invoice'];

        $files = glob(app_path('Http/Controllers/**/*.php')) ?: [];
        $files = array_merge($files, glob(app_path('Http/Controllers/*.php')) ?: []);

        foreach ($files as $file) {
            if (! is_file($file)) {
                continue;
            }
            $content = file_get_contents($file);
            if ($content === false) {
                $this->fail('Unable to read controller: '.basename($file));
            }

            foreach ($alwaysForbidden as $word) {
                $this->assertStringNotContainsString($word, $content, "Forbidden word [$word] found in controller: ".basename($file));
            }

            // Billing domain terms are confined to the billing controller.
            if (basename($file) === 'BillingController.php') {
                continue;
            }

            foreach ($billingOnlyKeywords as $word) {
                $this->assertStringNotContainsString($word, $content, "Forbidden word [$word] found in controller: ".basename($file));
            }
        }
    }
}
