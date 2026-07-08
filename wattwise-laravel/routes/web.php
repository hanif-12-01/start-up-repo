<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ElectricityEntryController;
use App\Http\Controllers\OnboardingController;
use App\Http\Controllers\RevenueEntryController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'Welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('onboarding', [OnboardingController::class, 'index'])->name('onboarding');
    Route::post('onboarding', [OnboardingController::class, 'store'])->name('onboarding.store');
    Route::inertia('businesses', 'Businesses')->name('businesses');

    Route::get('electricity', [ElectricityEntryController::class, 'index'])->name('electricity.index');
    Route::post('electricity', [ElectricityEntryController::class, 'store'])->name('electricity.store');

    Route::get('revenue', [RevenueEntryController::class, 'index'])->name('revenue.index');
    Route::post('revenue', [RevenueEntryController::class, 'store'])->name('revenue.store');
});

require __DIR__.'/settings.php';
