<?php

use App\Http\Controllers\ApplianceController;
use App\Http\Controllers\BusinessController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ElectricityEntryController;
use App\Http\Controllers\OnboardingController;
use App\Http\Controllers\RevenueEntryController;
use App\Http\Controllers\RecommendationController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\PlanController;
use App\Http\Controllers\PredictionController;
use App\Http\Controllers\AnomalyController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'Welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('onboarding', [OnboardingController::class, 'index'])->name('onboarding');
    Route::post('onboarding', [OnboardingController::class, 'store'])->name('onboarding.store');
    Route::get('businesses', [BusinessController::class, 'index'])->name('businesses.index');
    Route::post('businesses', [BusinessController::class, 'store'])->name('businesses.store');
    Route::put('businesses/{business}', [BusinessController::class, 'update'])->name('businesses.update');

    Route::get('electricity', [ElectricityEntryController::class, 'index'])->name('electricity.index');
    Route::post('electricity', [ElectricityEntryController::class, 'store'])->name('electricity.store');

    Route::get('revenue', [RevenueEntryController::class, 'index'])->name('revenue.index');
    Route::post('revenue', [RevenueEntryController::class, 'store'])->name('revenue.store');

    Route::get('appliances', [ApplianceController::class, 'index'])->name('appliances.index');
    Route::post('appliances', [ApplianceController::class, 'store'])->name('appliances.store');
    Route::post('appliances/apply-template', [ApplianceController::class, 'applyTemplate'])->name('appliances.apply-template');
    Route::put('appliances/{appliance}', [ApplianceController::class, 'update'])->name('appliances.update');
    Route::delete('appliances/{appliance}', [ApplianceController::class, 'destroy'])->name('appliances.destroy');

    Route::get('recommendations', [RecommendationController::class, 'index'])->name('recommendations.index');

    Route::get('predictions', [PredictionController::class, 'index'])->name('predictions.index');
    Route::post('predictions/generate', [PredictionController::class, 'generate'])->name('predictions.generate');

    Route::get('anomalies', [AnomalyController::class, 'index'])->name('anomalies.index');

    Route::get('reports', [ReportController::class, 'index'])->name('reports.index');
    Route::get('plans', [PlanController::class, 'index'])->name('plans.index');
    Route::post('plans/trial', [PlanController::class, 'startTrial'])->name('plans.trial');
});

require __DIR__.'/settings.php';
