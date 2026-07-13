<?php

namespace Tests\Feature;

use App\Models\Appliance;
use App\Models\Business;
use App\Models\ElectricityEntry;
use App\Models\Subscription;
use App\Models\User;
use App\Services\Reports\ReportExportService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportExportTest extends TestCase
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
     * Test guest requests are redirected to login.
     */
    public function test_guest_redirected_from_export(): void
    {
        $response = $this->get(route('reports.export'));
        $response->assertRedirect(route('login'));
    }

    /**
     * Test unverified user is redirected by route middleware.
     */
    public function test_unverified_user_cannot_export(): void
    {
        $unverifiedUser = User::factory()->create(['email_verified_at' => null]);
        $this->actingAs($unverifiedUser);

        $response = $this->get(route('reports.export'));
        $response->assertRedirect();
    }

    /**
     * Test authenticated owner can download latest month CSV (FREE plan).
     */
    public function test_owner_can_export_latest_month_csv(): void
    {
        $this->actingAs($this->user);

        // Add some data for the current month
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-05-01',
            'usage_kwh' => 150.0,
            'bill_amount_idr' => 225000.0,
        ]);

        $response = $this->get(route('reports.export', ['month' => '2026-05']));

        $response->assertOk();
        $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
        $response->assertHeader('Content-Disposition', 'attachment; filename="wattwise-laporan-my-first-business-2026-05.csv"');

        $content = $response->streamedContent();

        // Check BOM
        $this->assertStringStartsWith("\xEF\xBB\xBF", $content);
        // Check terminology & disclaimers
        $this->assertStringContainsString('Prediksi pemakaian listrik (kWh)', $content);
        $this->assertStringContainsString('Estimasi tagihan listrik (Rupiah)', $content);
        $this->assertStringContainsString('Hybrid AI Decision Support', $content);
        $this->assertStringContainsString('Prediksi dan estimasi WattWise AI bersifat perkiraan berdasarkan data yang dimasukkan pengguna dan bukan tagihan resmi PLN.', $content);
    }

    /**
     * Test exporting from a foreign business falls back safely.
     */
    public function test_owner_cannot_export_foreign_business_csv(): void
    {
        $otherUser = User::factory()->create();
        $otherBusiness = Business::create([
            'user_id' => $otherUser->id,
            'name' => 'Secret Business',
            'business_type' => 'RETAIL',
        ]);

        $this->actingAs($this->user);

        // Add data to owner's business
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-05-01',
            'usage_kwh' => 100.0,
        ]);

        // Requesting export for other business ID
        $response = $this->get(route('reports.export', ['business_id' => $otherBusiness->id]));

        $response->assertOk();
        $content = $response->streamedContent();

        // Should fallback to owner's own business
        $this->assertStringContainsString('My First Business', $content);
        $this->assertStringNotContainsString('Secret Business', $content);
    }

    /**
     * Test exporting from an archived business falls back safely.
     */
    public function test_owner_cannot_export_archived_business_csv(): void
    {
        $this->actingAs($this->user);

        // Make another active business so resolver has a fallback
        $fallbackBusiness = Business::create([
            'user_id' => $this->user->id,
            'name' => 'Active Fallback',
            'business_type' => 'LAUNDRY',
        ]);

        // Archive the first business
        $this->business->status = Business::STATUS_ARCHIVED;
        $this->business->save();

        // Add data to fallback business
        ElectricityEntry::create([
            'business_id' => $fallbackBusiness->id,
            'period_month' => '2026-05-01',
            'usage_kwh' => 100.0,
        ]);

        // Request export for the archived business ID
        $response = $this->get(route('reports.export', ['business_id' => $this->business->id]));

        $response->assertOk();
        $content = $response->streamedContent();

        // Should fallback to Active Fallback
        $this->assertStringContainsString('Active Fallback', $content);
        $this->assertStringNotContainsString('My First Business', $content);
    }

    /**
     * Test stale active-business session falls back safely.
     */
    public function test_stale_active_business_session_falls_back_safely(): void
    {
        $otherUser = User::factory()->create();
        $otherBusiness = Business::create([
            'user_id' => $otherUser->id,
            'name' => 'Foreign Stale',
            'business_type' => 'RETAIL',
        ]);

        $this->actingAs($this->user);

        // Put other business ID in session
        session(['active_business_id' => $otherBusiness->id]);

        // Add some data to user's own business
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-05-01',
            'usage_kwh' => 100.0,
        ]);

        $response = $this->get(route('reports.export'));
        $response->assertOk();
        $content = $response->streamedContent();

        // Should fallback to owner's own business
        $this->assertStringContainsString('My First Business', $content);
        $this->assertStringNotContainsString('Foreign Stale', $content);
    }

    /**
     * Test no active business redirects safely.
     */
    public function test_no_active_business_is_handled_safely(): void
    {
        $userWithoutBusiness = User::factory()->create(['initial_plan_selected_at' => now()]);
        $this->actingAs($userWithoutBusiness);

        $response = $this->get(route('reports.export'));
        $response->assertRedirect(route('onboarding'));
    }

    /**
     * Test that export does not unexpectedly change the active-business session.
     */
    public function test_export_does_not_change_active_business_session(): void
    {
        $this->actingAs($this->user);
        session(['active_business_id' => $this->business->id]);

        // Create another active business for the same user
        $secondBusiness = Business::create([
            'user_id' => $this->user->id,
            'name' => 'Second Business',
            'business_type' => 'LAUNDRY',
        ]);

        // Add data
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-05-01',
            'usage_kwh' => 100.0,
        ]);
        ElectricityEntry::create([
            'business_id' => $secondBusiness->id,
            'period_month' => '2026-05-01',
            'usage_kwh' => 200.0,
        ]);

        // Request export with business_id in query parameter
        $response = $this->get(route('reports.export', ['business_id' => $secondBusiness->id]));
        $response->assertOk();

        // The session active_business_id should still point to My First Business
        $this->assertEquals($this->business->id, session('active_business_id'));
    }

    /**
     * Test default month behavior is deterministic (latest month).
     */
    public function test_default_month_behavior_is_deterministic(): void
    {
        $this->actingAs($this->user);

        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-04-01',
            'usage_kwh' => 100.0,
        ]);
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-05-01',
            'usage_kwh' => 120.0,
        ]);

        // Omit month query parameter
        $response = $this->get(route('reports.export'));
        $response->assertOk();
        $content = $response->streamedContent();

        // Should export 2026-05 (latest)
        $this->assertStringContainsString('2026-05', $content);
        $this->assertStringNotContainsString('2026-04', $content);
    }

    /**
     * Test malformed month query parameter is rejected.
     */
    public function test_malformed_month_is_rejected(): void
    {
        $this->actingAs($this->user);

        $response = $this->get(route('reports.export', ['month' => '2026-abc']));
        $response->assertSessionHasErrors(['month']);
    }

    /**
     * Test impossible month query parameter is rejected.
     */
    public function test_impossible_month_is_rejected(): void
    {
        $this->actingAs($this->user);

        $response = $this->get(route('reports.export', ['month' => '2026-13']));
        $response->assertSessionHasErrors(['month']);
    }

    /**
     * Test unavailable month is handled predictably.
     */
    public function test_unavailable_month_is_rejected(): void
    {
        $this->actingAs($this->user);

        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-05-01',
            'usage_kwh' => 100.0,
        ]);

        $response = $this->get(route('reports.export', ['month' => '2026-04']));
        $response->assertRedirect(route('reports.index'));
        $response->assertSessionHas('error', 'Laporan untuk bulan 2026-04 tidak tersedia.');
    }

    /**
     * Test partial data exports safely.
     */
    public function test_partial_available_data_exports_safely(): void
    {
        $this->actingAs($this->user);

        // Electricity entry exists, but revenue entry is missing (partial data)
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-05-01',
            'usage_kwh' => 100.0,
            'bill_amount_idr' => 150000.0,
        ]);

        $response = $this->get(route('reports.export', ['month' => '2026-05']));
        $response->assertOk();
        $content = $response->streamedContent();

        $this->assertStringContainsString('100 kWh', $content);
        $this->assertStringContainsString('Tidak tersedia', $content); // Revenue should be represented as "Tidak tersedia"
    }

    /**
     * Test no available report month is rejected.
     */
    public function test_no_available_report_month_is_rejected(): void
    {
        $this->actingAs($this->user);

        // No electricity or revenue entries exist
        $response = $this->get(route('reports.export'));
        $response->assertRedirect(route('reports.index'));
        $response->assertSessionHas('error', 'Tidak ada data laporan yang tersedia untuk diekspor.');
    }

    /**
     * Test FREE user cannot bypass historical lock by calling export URL directly.
     */
    public function test_free_user_cannot_export_historical_month_csv(): void
    {
        $this->actingAs($this->user);

        // Add older month entry
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-04-01',
            'usage_kwh' => 100.0,
        ]);

        // Add latest month entry (this will be the latest available)
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-05-01',
            'usage_kwh' => 120.0,
        ]);

        // Attempting to export 2026-04 which is historical (latest is 2026-05)
        $response = $this->get(route('reports.export', ['month' => '2026-04']));

        $response->assertRedirect(route('reports.index'));
        $response->assertSessionHas('error', 'Laporan bulan historis dikunci pada paket Gratis. Silakan upgrade ke Pro untuk melihat riwayat lengkap.');
    }

    /**
     * Test PRO_TRIAL historical behavior is correct.
     */
    public function test_pro_trial_user_can_export_historical_month_csv(): void
    {
        Subscription::create([
            'user_id' => $this->user->id,
            'plan' => 'PRO_TRIAL',
            'status' => 'ACTIVE',
            'trial_ends_at' => Carbon::now()->addDays(10),
        ]);

        $this->actingAs($this->user);

        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-04-01',
            'usage_kwh' => 100.0,
        ]);
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-05-01',
            'usage_kwh' => 120.0,
        ]);

        $response = $this->get(route('reports.export', ['month' => '2026-04']));
        $response->assertOk();
    }

    /**
     * Test PRO user can export historical month CSV successfully.
     */
    public function test_pro_user_can_export_historical_month_csv(): void
    {
        Subscription::create([
            'user_id' => $this->user->id,
            'plan' => 'PRO',
            'status' => 'ACTIVE',
        ]);

        $this->actingAs($this->user);

        // Add older month entry
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-04-01',
            'usage_kwh' => 100.0,
            'bill_amount_idr' => 150000.0,
        ]);

        // Add latest month entry
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-05-01',
            'usage_kwh' => 120.0,
        ]);

        // Pro user requests historical export
        $response = $this->get(route('reports.export', ['month' => '2026-04']));

        $response->assertOk();
        $content = $response->streamedContent();

        $this->assertStringContainsString('2026-04', $content);
        $this->assertStringContainsString('100 kWh', $content);
    }

    /**
     * Test BUSINESS historical behavior is correct.
     */
    public function test_business_user_can_export_historical_month_csv(): void
    {
        Subscription::create([
            'user_id' => $this->user->id,
            'plan' => 'BUSINESS',
            'status' => 'ACTIVE',
        ]);

        $this->actingAs($this->user);

        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-04-01',
            'usage_kwh' => 100.0,
        ]);
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-05-01',
            'usage_kwh' => 120.0,
        ]);

        $response = $this->get(route('reports.export', ['month' => '2026-04']));
        $response->assertOk();
    }

    /**
     * Test ENTERPRISE historical behavior is correct.
     */
    public function test_enterprise_user_can_export_historical_month_csv(): void
    {
        Subscription::create([
            'user_id' => $this->user->id,
            'plan' => 'ENTERPRISE',
            'status' => 'ACTIVE',
        ]);

        $this->actingAs($this->user);

        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-04-01',
            'usage_kwh' => 100.0,
        ]);
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-05-01',
            'usage_kwh' => 120.0,
        ]);

        $response = $this->get(route('reports.export', ['month' => '2026-04']));
        $response->assertOk();
    }

    /**
     * Test filename sanitization and deterministic slug.
     */
    public function test_filename_is_deterministic_and_sanitized(): void
    {
        $this->actingAs($this->user);

        $this->business->name = "My / Safe \\ Business... \"Name\" :; \r\n \0!";
        $this->business->save();

        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-05-01',
            'usage_kwh' => 100.0,
        ]);

        $response = $this->get(route('reports.export', ['month' => '2026-05']));

        $response->assertOk();
        $expectedFilename = 'wattwise-laporan-my-safe-business-name-2026-05.csv';
        $response->assertHeader('Content-Disposition', "attachment; filename=\"{$expectedFilename}\"");
    }

    /**
     * Test CSV encoding, Indonesian Unicode support, required disclaimers, and terminology.
     */
    public function test_csv_encoding_disclaimers_and_terminology(): void
    {
        $this->actingAs($this->user);

        $this->business->name = 'Usaha Kopi Toraja ☕';
        $this->business->save();

        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-05-01',
            'usage_kwh' => 100.0,
        ]);

        $response = $this->get(route('reports.export', ['month' => '2026-05']));
        $response->assertOk();

        $content = $response->streamedContent();

        $this->assertStringStartsWith("\xEF\xBB\xBF", $content);
        $this->assertStringContainsString('Usaha Kopi Toraja ☕', $content);

        // Required disclaimers
        $this->assertStringContainsString('Prediksi dan estimasi WattWise AI bersifat perkiraan berdasarkan data yang dimasukkan pengguna dan bukan tagihan resmi PLN.', $content);
        $this->assertStringContainsString('WattWise AI bukan aplikasi resmi PLN, bukan pengganti PLN Mobile, dan bukan alat ukur listrik resmi.', $content);
        $this->assertStringContainsString('Perhitungan peralatan berdasarkan data daya dan jam pakai yang Anda input. Tanpa sensor, WattWise AI tidak mengukur konsumsi aktual tiap alat.', $content);
        $this->assertStringContainsString('Sisa pendapatan setelah listrik belum memperhitungkan biaya operasional lain seperti bahan baku, gaji, sewa, air, internet, dan biaya lainnya.', $content);

        // Required concepts
        $this->assertStringContainsString('Prediksi pemakaian listrik', $content);
        $this->assertStringContainsString('Estimasi tagihan listrik', $content);
        $this->assertStringContainsString('Hybrid AI Decision Support', $content);

        // Database IDs or internal sensitive fields check
        $this->assertStringNotContainsString('password', $content);
        $this->assertStringNotContainsString('remember_token', $content);
        $this->assertStringNotContainsString('Secret Business', $content);
    }

    /**
     * Test CSV injection prevention prepends trigger characters with a single quote.
     */
    public function test_csv_injection_prevention(): void
    {
        $this->actingAs($this->user);

        // Put an injection payload in appliance name
        Appliance::create([
            'business_id' => $this->business->id,
            'name' => '=SUM(1,1)',
            'quantity' => 1,
            'watt' => 100,
            'hours_per_day' => 10,
            'days_per_month' => 30,
            'source' => 'MANUAL',
            'confidence' => 'USER_CUSTOM',
        ]);

        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-05-01',
            'usage_kwh' => 100.0,
        ]);

        $response = $this->get(route('reports.export', ['month' => '2026-05']));

        $response->assertOk();
        $content = $response->streamedContent();

        // Verify the `=SUM(1,1)` in the CSV output is neutralized
        $this->assertStringContainsString("'=SUM(1,1)", $content);

        // Verify focused tests on ReportExportService::sanitizeForCsv directly
        $exportService = new ReportExportService;

        // Neutralize dangerous prefixes
        $this->assertEquals("'=SUM(1,1)", $exportService->sanitizeForCsv('=SUM(1,1)'));
        $this->assertEquals("'+cmd", $exportService->sanitizeForCsv('+cmd'));
        $this->assertEquals("'-2+3", $exportService->sanitizeForCsv('-2+3'));
        $this->assertEquals("'@SUM(1,1)", $exportService->sanitizeForCsv('@SUM(1,1)'));
        $this->assertEquals("' =SUM(1,1)", $exportService->sanitizeForCsv(' =SUM(1,1)'));
        $this->assertEquals("'\tcontent", $exportService->sanitizeForCsv("\tcontent"));
        $this->assertEquals("'\rcontent", $exportService->sanitizeForCsv("\rcontent"));
        $this->assertEquals("'\ncontent", $exportService->sanitizeForCsv("\ncontent"));

        // Verify normal text remains unchanged
        $this->assertEquals('Kulkas Standar', $exportService->sanitizeForCsv('Kulkas Standar'));

        // Verify trusted numeric values are not corrupted
        $this->assertEquals('150', $exportService->sanitizeForCsv(150));
        $this->assertEquals('-150', $exportService->sanitizeForCsv(-150));
        $this->assertEquals('-150.5', $exportService->sanitizeForCsv('-150.5'));
    }
}
