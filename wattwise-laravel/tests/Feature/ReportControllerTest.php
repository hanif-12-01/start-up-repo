<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\ElectricityEntry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportControllerTest extends TestCase
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
     * Test guests are redirected from reports page.
     */
    public function test_guest_redirected_from_reports_page(): void
    {
        $response = $this->get(route('reports.index'));
        $response->assertRedirect(route('login'));
    }

    /**
     * Test authenticated user can view reports page.
     */
    public function test_authenticated_user_can_view_reports_page(): void
    {
        $this->actingAs($this->user);

        $response = $this->get(route('reports.index'));
        $response->assertOk();
    }

    /**
     * Test reports page includes report prop.
     */
    public function test_reports_page_includes_report_prop(): void
    {
        $this->actingAs($this->user);

        $response = $this->get(route('reports.index'));
        $response->assertOk();
        
        $response->assertInertia(fn ($page) => $page
            ->component('Reports/Index')
            ->has('report')
            ->has('report.electricity')
            ->has('report.revenue')
            ->has('report.disclaimers')
        );
    }

    /**
     * Test no business shows NO_BUSINESS report state.
     */
    public function test_no_business_shows_no_business_report_state(): void
    {
        $userWithoutBusiness = User::factory()->create();
        $this->actingAs($userWithoutBusiness);

        $response = $this->get(route('reports.index'));
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Reports/Index')
            ->where('report.data_completeness', 'NO_BUSINESS')
            ->where('report.business', null)
        );
    }

    /**
     * Test selected month query is accepted.
     */
    public function test_selected_month_query_is_accepted(): void
    {
        $this->actingAs($this->user);

        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-05-01',
            'bill_amount_idr' => 200000.00,
        ]);

        $response = $this->get(route('reports.index', ['month' => '2026-05']));
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Reports/Index')
            ->where('report.selected_month', '2026-05')
            ->where('report.electricity.data_status', 'AVAILABLE')
        );
    }

    /**
     * Test invalid selected month does not crash.
     */
    public function test_invalid_selected_month_does_not_crash(): void
    {
        $this->actingAs($this->user);

        $response = $this->get(route('reports.index', ['month' => 'invalid-date']));
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Reports/Index')
            ->has('report')
        );
    }

    /**
     * Test reports page does not leak another user's business data.
     */
    public function test_reports_page_does_not_leak_another_users_business_data(): void
    {
        $otherUser = User::factory()->create();
        $otherBusiness = Business::create([
            'user_id' => $otherUser->id,
            'name' => 'Other Business',
            'business_type' => 'RETAIL',
        ]);

        ElectricityEntry::create([
            'business_id' => $otherBusiness->id,
            'period_month' => '2026-05-01',
            'bill_amount_idr' => 999999.00,
        ]);

        $this->actingAs($this->user);

        $response = $this->get(route('reports.index', ['month' => '2026-05']));
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Reports/Index')
            ->where('report.electricity.data_status', 'MISSING')
            ->where('report.electricity.bill_amount', null)
        );
    }

    /**
     * Test report includes required disclaimers.
     */
    public function test_report_includes_required_disclaimers(): void
    {
        $this->actingAs($this->user);

        $response = $this->get(route('reports.index'));
        $response->assertOk();
        
        $response->assertInertia(fn ($page) => $page
            ->component('Reports/Index')
            ->where('report.disclaimers.0', 'Prediksi dan estimasi WattWise AI bersifat perkiraan berdasarkan data yang dimasukkan pengguna dan bukan tagihan resmi PLN.')
            ->where('report.disclaimers.1', 'WattWise AI bukan aplikasi resmi PLN, bukan pengganti PLN Mobile, dan bukan alat ukur listrik resmi.')
            ->where('report.disclaimers.2', 'Perhitungan peralatan berdasarkan data daya dan jam pakai yang Anda input. Tanpa sensor, WattWise AI tidak mengukur konsumsi aktual tiap alat.')
            ->where('report.disclaimers.3', 'Sisa pendapatan setelah listrik belum memperhitungkan biaya operasional lain seperti bahan baku, gaji, sewa, air, internet, dan biaya lainnya.')
        );
    }
}
