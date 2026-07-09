<?php

namespace Tests\Feature;

use App\Models\Appliance;
use App\Models\Business;
use App\Models\User;
use App\Models\Subscription;
use App\Services\Reports\MonthlyReportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlanReportHardeningTest extends TestCase
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
            'name' => 'Usaha Utama',
            'business_type' => 'KOS_PROPERTY',
        ]);
    }

    /**
     * Test that reports page filters by owned businesses and prevents data leakage
     * when requesting another user's business_id.
     */
    public function test_reports_page_business_scoping_prevents_leakage(): void
    {
        $otherUser = User::factory()->create();
        $otherBusiness = Business::create([
            'user_id' => $otherUser->id,
            'name' => 'Usaha Rahasia',
            'business_type' => 'LAUNDRY',
        ]);

        $this->actingAs($this->user);

        // Attempting to query another user's business ID
        $response = $this->get(route('reports.index', ['business_id' => $otherBusiness->id]));

        $response->assertOk();

        // The resolved business in Inertia props should fallback to the user's own business
        $response->assertInertia(fn ($page) => $page
            ->component('Reports/Index')
            ->where('report.business.id', $this->business->id)
            ->where('report.business.name', $this->business->name)
        );
    }

    /**
     * Test deterministic tie-breaking sorting of top appliance candidates in MonthlyReportService.
     */
    public function test_monthly_report_appliance_sorting_tie_breakers(): void
    {
        // Appliance B: 100W, qty 1, 10h, 30 days = 30 kWh
        Appliance::create([
            'business_id' => $this->business->id,
            'name' => 'Appliance B',
            'watt' => 100,
            'quantity' => 1,
            'hours_per_day' => 10,
            'days_per_month' => 30,
            'source' => 'MANUAL',
            'confidence' => 'USER_CUSTOM',
        ]);

        // Appliance A: 100W, qty 1, 10h, 30 days = 30 kWh
        Appliance::create([
            'business_id' => $this->business->id,
            'name' => 'Appliance A',
            'watt' => 100,
            'quantity' => 1,
            'hours_per_day' => 10,
            'days_per_month' => 30,
            'source' => 'MANUAL',
            'confidence' => 'USER_CUSTOM',
        ]);

        $service = $this->app->make(MonthlyReportService::class);
        $report = $service->generate($this->business);

        $candidates = $report['appliances']['top_candidates'];

        // Should return both, with Appliance A ranked first (alphabetically)
        $this->assertCount(2, $candidates);
        $this->assertEquals('Appliance A', $candidates[0]['name']);
        $this->assertEquals('Appliance B', $candidates[1]['name']);
    }

    /**
     * Test that user with an active paid subscription cannot activate Pro Trial.
     */
    public function test_active_paid_subscriber_cannot_start_trial(): void
    {
        $this->actingAs($this->user);

        // Put active paid plan PRO
        Subscription::create([
            'user_id' => $this->user->id,
            'plan' => 'PRO',
            'status' => 'ACTIVE',
        ]);

        $response = $this->post(route('plans.trial'));

        $response->assertRedirect();
        $response->assertSessionHas('error', 'Anda sudah memiliki langganan berbayar yang aktif.');

        $this->user->refresh();
        $this->assertEquals('PRO', $this->user->subscription->plan);
        $this->assertEquals('ACTIVE', $this->user->subscription->status);
    }

    /**
     * Test trial activation idempotency.
     */
    public function test_trial_activation_is_idempotent(): void
    {
        $this->actingAs($this->user);

        // First trial activation
        $response1 = $this->post(route('plans.trial'));
        $response1->assertRedirect();
        $response1->assertSessionHas('success');

        $this->user->refresh();
        $this->assertEquals('PRO_TRIAL', $this->user->subscription->plan);

        // Second trial activation attempt
        $response2 = $this->post(route('plans.trial'));
        $response2->assertRedirect();
        $response2->assertSessionHas('error', 'Anda sudah pernah menggunakan masa uji coba (trial) sebelumnya.');
    }
}
