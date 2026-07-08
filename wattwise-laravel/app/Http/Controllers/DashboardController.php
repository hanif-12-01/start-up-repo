<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Display the dashboard.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        
        $firstBusiness = $user ? $user->businesses()->first() : null;
        $businessCount = $user ? $user->businesses()->count() : 0;
        $hasBusiness = $businessCount > 0;

        return Inertia::render('Dashboard', [
            'userName' => $user ? $user->name : '',
            'hasBusiness' => $hasBusiness,
            'businessCount' => $businessCount,
            'businessName' => $firstBusiness ? $firstBusiness->name : null,
            'businessType' => $firstBusiness ? $firstBusiness->business_type : null,
        ]);
    }
}
