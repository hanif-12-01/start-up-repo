<?php

namespace Tests\Feature;

use App\Models\Appliance;
use App\Models\Business;
use App\Models\ElectricityEntry;
use App\Models\RevenueEntry;
use App\Models\Subscription;
use App\Models\User;
use App\Services\Reports\MonthlyReportService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PdfReportDownloadTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Business $business;

    protected function setUp(): void
    {
        parent::setUp();

        config(['pdf_reports.enabled' => true]);

        $this->user = User::factory()->create();
        $this->business = Business::create([
            'user_id' => $this->user->id,
            'name' => 'Kos Aman / Cabang',
            'business_type' => 'KOS_PROPERTY',
            'status' => Business::STATUS_ACTIVE,
        ]);

        Subscription::create([
            'user_id' => $this->user->id,
            'plan' => 'PRO_TRIAL',
            'status' => 'ACTIVE',
            'trial_starts_at' => now()->subDay(),
            'trial_ends_at' => now()->addDays(29),
        ]);

        $this->seedReportData($this->business);
    }

    public function test_guest_cannot_download_pdf_report(): void
    {
        $this->get(route('reports.pdf', ['business' => $this->business, 'month' => '2026-06']))
            ->assertRedirect(route('login'));
    }

    public function test_eligible_owner_can_download_pdf_with_safe_headers_and_signature(): void
    {
        $response = $this->actingAs($this->user)
            ->get(route('reports.pdf', ['business' => $this->business, 'month' => '2026-06']));

        $response->assertOk()
            ->assertHeader('Content-Type', 'application/pdf')
            ->assertHeader('Content-Disposition', 'attachment; filename="wattwise-laporan-kos-aman-cabang-2026-06.pdf"')
            ->assertHeader('Cache-Control', 'no-store, private');

        $content = $response->getContent();
        if ($content === false) {
            $this->fail('PDF response returned no content.');
        }

        $this->assertStringStartsWith('%PDF', $content);
    }

    public function test_foreign_business_is_denied(): void
    {
        $otherUser = User::factory()->create();

        $this->actingAs($otherUser)
            ->get(route('reports.pdf', ['business' => $this->business, 'month' => '2026-06']))
            ->assertForbidden();
    }

    public function test_archived_business_is_denied(): void
    {
        $this->business->update(['status' => Business::STATUS_ARCHIVED]);

        $this->actingAs($this->user)
            ->get(route('reports.pdf', ['business' => $this->business, 'month' => '2026-06']))
            ->assertForbidden();
    }

    public function test_invalid_period_is_rejected(): void
    {
        $this->actingAs($this->user)
            ->withHeader('Accept', 'application/json')
            ->get(route('reports.pdf', ['business' => $this->business, 'month' => '2026-99']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('month');
    }

    public function test_missing_report_data_is_not_rendered(): void
    {
        $emptyBusiness = Business::create([
            'user_id' => $this->user->id,
            'name' => 'Kos Tanpa Data',
            'business_type' => 'KOS_PROPERTY',
            'status' => Business::STATUS_ACTIVE,
        ]);

        $this->actingAs($this->user)
            ->get(route('reports.pdf', ['business' => $emptyBusiness, 'month' => '2026-06']))
            ->assertNotFound();
    }

    public function test_free_plan_is_denied_but_active_trial_is_eligible(): void
    {
        $this->user->subscription()->delete();

        $this->actingAs($this->user)
            ->get(route('reports.pdf', ['business' => $this->business, 'month' => '2026-06']))
            ->assertForbidden();

        Subscription::create([
            'user_id' => $this->user->id,
            'plan' => 'PRO_TRIAL',
            'status' => 'ACTIVE',
            'trial_ends_at' => now()->addWeek(),
        ]);
        $this->user->unsetRelation('subscription');

        $this->actingAs($this->user)
            ->get(route('reports.pdf', ['business' => $this->business, 'month' => '2026-06']))
            ->assertOk();
    }

    public function test_pdf_feature_is_fail_closed_when_disabled(): void
    {
        config(['pdf_reports.enabled' => false]);

        $this->actingAs($this->user)
            ->get(route('reports.pdf', ['business' => $this->business, 'month' => '2026-06']))
            ->assertNotFound();
    }

    public function test_pdf_view_uses_server_report_values_and_safe_wording(): void
    {
        CarbonImmutable::setTestNow('2026-07-12 09:15:00');

        Appliance::create([
            'business_id' => $this->business->id,
            'name' => '<script>alert(1)</script>',
            'category' => 'OTHER',
            'watt' => 9999,
            'quantity' => 1,
            'hours_per_day' => 24,
            'days_per_month' => 30,
            'source' => 'MANUAL',
            'confidence' => 'USER_CUSTOM',
        ]);

        $report = app(MonthlyReportService::class)->generate($this->business, '2026-06');
        $html = view('reports.monthly-pdf', [
            'report' => $report,
            'generatedAt' => CarbonImmutable::now(),
        ])->render();

        $this->assertStringContainsString('Kos Aman / Cabang', $html);
        $this->assertStringContainsString('321.000', $html);
        $this->assertStringContainsString('8.500.000', $html);
        $this->assertStringContainsString('1.234,50', $html);
        $this->assertStringContainsString('1.444,75', $html);
        $this->assertStringContainsString('Prediksi dan estimasi WattWise AI bersifat perkiraan berdasarkan data yang dimasukkan pengguna', $html);
        $this->assertStringContainsString('WattWise AI bukan aplikasi resmi PLN', $html);
        $this->assertStringContainsString('&lt;script&gt;alert(1)&lt;/script&gt;', $html);
        $this->assertStringNotContainsString('<script>alert(1)</script>', $html);
        $this->assertStringNotContainsString('penyebab pasti', $html);
        $this->assertStringNotContainsString('alat rusak', $html);
        $this->assertStringNotContainsString('AI memastikan', $html);
        $this->assertStringNotContainsString('sistem menjamin', $html);
    }

    public function test_existing_csv_export_remains_functional(): void
    {
        $this->actingAs($this->user)
            ->get(route('reports.export', ['month' => '2026-06']))
            ->assertOk()
            ->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
    }

    private function seedReportData(Business $business): void
    {
        ElectricityEntry::create([
            'business_id' => $business->id,
            'period_month' => '2026-06-01',
            'usage_kwh' => 210.25,
            'bill_amount_idr' => 321000,
            'meter_start' => 1234.50,
            'meter_end' => 1444.75,
            'tariff_per_kwh' => 1527.00,
            'payment_method' => 'PASCABAYAR',
        ]);

        RevenueEntry::create([
            'business_id' => $business->id,
            'period_month' => '2026-06-01',
            'revenue_amount_idr' => 8500000,
            'revenue_input_mode' => 'EXACT',
        ]);

        Appliance::create([
            'business_id' => $business->id,
            'name' => 'AC Kamar',
            'category' => 'COOLING',
            'watt' => 800,
            'quantity' => 2,
            'hours_per_day' => 8,
            'days_per_month' => 30,
            'source' => 'MANUAL',
            'confidence' => 'USER_CUSTOM',
        ]);
    }
}
