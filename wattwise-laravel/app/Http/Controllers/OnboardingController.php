<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreOnboardingRequest;
use App\Models\Business;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class OnboardingController extends Controller
{
    /**
     * Show the onboarding form.
     */
    public function index(Request $request): Response|RedirectResponse
    {
        $user = $request->user();

        // If user already has a business, redirect to dashboard
        if ($user && $user->businesses()->exists()) {
            return redirect()->route('dashboard')->with('success', 'Anda sudah menyelesaikan onboarding.');
        }

        return Inertia::render('Onboarding');
    }

    /**
     * Store onboarding information.
     */
    public function store(StoreOnboardingRequest $request): RedirectResponse
    {
        $user = $request->user();

        // Perform in database transaction for data safety
        DB::transaction(function () use ($request, $user) {
            $business = new Business();
            $business->user_id = $user->id;
            $business->name = $request->input('name');
            $business->business_type = $request->input('business_type');
            $business->city = $request->input('city');
            $business->province = $request->input('province');
            $business->address = $request->input('address');
            $business->status = 'ACTIVE';
            $business->onboarding_completed_at = now();
            $business->save();

            // Create BusinessProfile
            $business->businessProfile()->create([
                'room_count' => $request->input('room_count'),
                'occupied_room_count' => $request->input('occupied_room_count'),
                'employee_count' => $request->input('employee_count'),
                'operating_days_per_month' => $request->input('operating_days_per_month'),
            ]);

            // Create ElectricityProfile
            $business->electricityProfile()->create([
                'customer_type' => $request->input('customer_type'),
                'power_va' => $request->input('power_va'),
                'tariff_per_kwh' => $request->input('tariff_per_kwh'),
                'payment_method' => $request->input('payment_method'),
            ]);
        });

        return redirect()->route('dashboard')->with('success', 'Profil usaha Anda berhasil dibuat. Selamat datang di WattWise!');
    }
}
