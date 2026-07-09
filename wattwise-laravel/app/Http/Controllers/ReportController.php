<?php

namespace App\Http\Controllers;

use App\Services\Reports\MonthlyReportService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    public function __construct(
        private readonly MonthlyReportService $monthlyReportService
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

        return Inertia::render('Reports/Index', [
            'report' => $report,
        ]);
    }
}
