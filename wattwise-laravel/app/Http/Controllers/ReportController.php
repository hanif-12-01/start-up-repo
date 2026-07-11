<?php

namespace App\Http\Controllers;

use App\Http\Requests\ExportReportRequest;
use App\Services\ActiveBusinessResolver;
use App\Services\FeatureGateService;
use App\Services\Reports\MonthlyReportService;
use App\Services\Reports\ReportExportService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public function __construct(
        private readonly MonthlyReportService $monthlyReportService,
        private readonly FeatureGateService $featureGateService,
        private readonly ReportExportService $reportExportService
    ) {}

    /**
     * Display the monthly reports page.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $resolver = app(ActiveBusinessResolver::class);
        $business = $resolver->resolve($request);
        $businesses = $resolver->activeBusinesses($request);

        // Read optional query parameter: month=YYYY-MM
        $month = $request->query('month');

        // Generate the report
        $report = $this->monthlyReportService->generate($business, $month);

        $effectivePlan = $business ? $this->featureGateService->getEffectivePlan($user, $business) : null;
        $availableMonths = $report['available_months'] ?? [];
        $selectedMonth = $report['selected_month'] ?? $month;

        $isLocked = $this->isMonthLocked($effectivePlan, $availableMonths, $selectedMonth);

        if ($isLocked) {
            // Redact sensitive details for Gratis users on older months
            $report['electricity']['usage_kwh'] = null;
            $report['electricity']['bill_amount'] = null;
            $report['electricity']['tariff_per_kwh'] = null;
            $report['revenue']['amount'] = null;
            $report['financial_impact']['electricity_revenue_ratio_percent'] = null;
            $report['financial_impact']['remaining_revenue_after_electricity'] = null;
            $report['appliances']['top_candidates'] = [];
            $report['recommendations'] = [];
            $report['efficiency_score'] = [
                'score' => null,
                'label' => 'Akses Terbatas',
                'status' => 'INCOMPLETE',
                'confidence' => 'LOW',
                'explanation' => 'Laporan bulan historis dikunci pada paket Gratis. Silakan upgrade ke Pro untuk melihat riwayat lengkap.',
            ];
        }

        return Inertia::render('Reports/Index', [
            'report' => $report,
            'effectivePlan' => $effectivePlan,
            'isLocked' => $isLocked,
            'businesses' => $businesses,
            'activeBusinessId' => $business ? $business->id : null,
        ]);
    }

    /**
     * Export the monthly report as a CSV file.
     */
    public function export(ExportReportRequest $request): RedirectResponse|StreamedResponse
    {
        $user = $request->user();
        $resolver = app(ActiveBusinessResolver::class);

        // Strip business_id query parameter from the request to prevent unexpected session changes
        $requestWithoutBusinessId = $request->duplicate(query: array_diff_key($request->query(), ['business_id' => '']));
        $business = $resolver->resolve($requestWithoutBusinessId);

        if (! $business) {
            return redirect()->route('reports.index')->with('error', 'Anda belum memiliki usaha aktif.');
        }

        // Get available months to perform validation checks
        $availableMonths = $this->monthlyReportService->getAvailableMonths($business);

        // Read optional query parameter: month=YYYY-MM
        $month = $request->validated()['month'] ?? null;

        if ($month !== null) {
            if (! in_array($month, $availableMonths, true)) {
                return redirect()->route('reports.index')->with('error', "Laporan untuk bulan {$month} tidak tersedia.");
            }
        } else {
            if (empty($availableMonths)) {
                return redirect()->route('reports.index')->with('error', 'Tidak ada data laporan yang tersedia untuk diekspor.');
            }
            $month = $availableMonths[0];
        }

        // Generate the report data
        $report = $this->monthlyReportService->generate($business, $month);

        $effectivePlan = $this->featureGateService->getEffectivePlan($user, $business);
        $selectedMonth = $report['selected_month'] ?? $month;

        if ($this->isMonthLocked($effectivePlan, $availableMonths, $selectedMonth)) {
            return redirect()->route('reports.index')->with('error', 'Laporan bulan historis dikunci pada paket Gratis. Silakan upgrade ke Pro untuk melihat riwayat lengkap.');
        }

        // Sanitize business name for filename
        $businessName = $business->name ?? 'usaha';
        $safeBusinessName = preg_replace('/[^a-zA-Z0-9_\-]/', '-', $businessName);
        $safeBusinessName = preg_replace('/-+/', '-', $safeBusinessName);
        $safeBusinessName = preg_replace('/_+/', '_', $safeBusinessName);
        $safeBusinessName = trim($safeBusinessName, '-_');
        $safeBusinessName = strtolower($safeBusinessName);
        if (empty($safeBusinessName)) {
            $safeBusinessName = 'usaha';
        }

        $filename = "wattwise-laporan-{$safeBusinessName}-{$selectedMonth}.csv";

        return response()->stream(
            function () use ($report) {
                $stream = fopen('php://output', 'w');
                if ($stream === false) {
                    throw new RuntimeException('Unable to open the CSV output stream.');
                }
                try {
                    $this->reportExportService->export($stream, $report);
                } finally {
                    fclose($stream);
                }
            },
            200,
            [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Content-Disposition' => "attachment; filename=\"{$filename}\"",
                'Cache-Control' => 'no-cache, no-store, must-revalidate',
                'Pragma' => 'no-cache',
                'Expires' => '0',
            ]
        );
    }

    /**
     * Check if the selected month is locked based on the user's plan.
     *
     * @param  array<string, mixed>|null  $effectivePlan
     * @param  array<int, string>  $availableMonths
     */
    private function isMonthLocked(?array $effectivePlan, array $availableMonths, ?string $selectedMonth): bool
    {
        if ($effectivePlan && $effectivePlan['id'] === 'FREE') {
            if (count($availableMonths) > 0) {
                $latestMonth = $availableMonths[0]; // Available months is sorted desc
                if ($selectedMonth && $selectedMonth !== $latestMonth) {
                    return true;
                }
            }
        }

        return false;
    }
}
