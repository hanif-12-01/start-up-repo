<?php

namespace App\Http\Controllers;

use App\Services\Reports\MonthlyReportService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    public function __construct(
        private readonly MonthlyReportService $monthlyReportService,
        private readonly \App\Services\FeatureGateService $featureGateService
    ) {}

    /**
     * Display the monthly reports page.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        
        // Resolve authenticated user's active/first business
        $business = $user ? $user->businesses()->first() : null;

        // Read optional query parameter: month=YYYY-MM
        $month = $request->query('month');

        // Generate the report
        $report = $this->monthlyReportService->generate($business, $month);

        $effectivePlan = $business ? $this->featureGateService->getEffectivePlan($user, $business) : null;
        $isLocked = false;

        if ($effectivePlan && $effectivePlan['id'] === 'FREE') {
            // Check if month selected is older than the latest available month
            $availableMonths = $report['available_months'] ?? [];
            if (count($availableMonths) > 0) {
                $latestMonth = $availableMonths[0]; // Available months is sorted desc
                $selectedMonth = $report['selected_month'] ?? $month;
                
                if ($selectedMonth && $selectedMonth !== $latestMonth) {
                    $isLocked = true;
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
            }
        }

        return Inertia::render('Reports/Index', [
            'report' => $report,
            'effectivePlan' => $effectivePlan,
            'isLocked' => $isLocked,
        ]);
    }
}
