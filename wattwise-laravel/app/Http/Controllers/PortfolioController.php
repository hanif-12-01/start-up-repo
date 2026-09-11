<?php

namespace App\Http\Controllers;

use App\Services\Portfolio\PortfolioOverviewService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PortfolioController extends Controller
{
    public function __construct(
        private readonly PortfolioOverviewService $portfolioOverviewService
    ) {}

    /**
     * Display the multi-location portfolio command center.
     */
    public function index(Request $request): Response|RedirectResponse
    {
        $user = $request->user();

        // 1. Authorization & business count check
        $activeBusinessesCount = $user->businesses()->active()->count();

        // Single active business or fewer: redirect safely to dashboard
        // (If 0 businesses, 'journey' middleware redirects to onboarding create).
        if ($activeBusinessesCount < 2) {
            return redirect()->route('dashboard');
        }

        // 2. Resolve requested month parameter (safe validation)
        $month = $request->query('month');
        if ($month !== null && (! is_string($month) || ! preg_match('/^\d{4}-\d{2}$/', $month))) {
            $month = null;
        }

        // 3. Build read-only portfolio overview (no GET mutation)
        $portfolioData = $this->portfolioOverviewService->getOverview($user, $month);

        return Inertia::render('portfolio/Index', [
            'portfolio' => $portfolioData,
        ]);
    }
}
