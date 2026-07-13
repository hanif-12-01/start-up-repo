<?php

use App\Http\Controllers\AnomalyController;
use App\Http\Controllers\ApplianceController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\BusinessController;
use App\Http\Controllers\BusinessSelectionController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ElectricityEntryController;
use App\Http\Controllers\GettingStartedController;
use App\Http\Controllers\OnboardingController;
use App\Http\Controllers\PlanController;
use App\Http\Controllers\PredictionController;
use App\Http\Controllers\RecommendationController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\RevenueEntryController;
use App\Http\Controllers\WelcomeController;
use App\Http\Middleware\EnsureBillingEnabled;
use App\Services\Demo\DemoLoginReadinessService;
use App\Support\DemoAccount;
use Illuminate\Support\Facades\Route;

Route::get('/', WelcomeController::class)->name('home');

if (DemoAccount::environmentAllowed()) {
    Route::get('up/demo', function () {
        $result = app(DemoLoginReadinessService::class)->check();

        return response()->json([
            'status' => $result->ready ? 'ok' : 'fail',
            'demo' => $result->ready ? 'ready' : 'not_ready',
            'reason' => $result->ready ? null : $result->reason->name,
        ], $result->ready ? 200 : 503);
    })->name('up.demo');
}

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('getting-started/plan', [GettingStartedController::class, 'plan'])->name('getting-started.plan');
    Route::post('getting-started/choose-free', [GettingStartedController::class, 'chooseFree'])->name('getting-started.choose-free');
    Route::post('getting-started/choose-trial', [GettingStartedController::class, 'chooseTrial'])->name('getting-started.choose-trial');

    Route::middleware('journey:onboarding')->group(function () {
        Route::get('onboarding', [OnboardingController::class, 'index'])->name('onboarding');
        Route::post('onboarding', [OnboardingController::class, 'store'])->name('onboarding.store');
    });

    Route::middleware('journey')->group(function () {
        Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');

        Route::get('businesses', [BusinessController::class, 'index'])->name('businesses.index');
        Route::post('businesses', [BusinessController::class, 'store'])->name('businesses.store');
        Route::post('businesses/select', BusinessSelectionController::class)->name('businesses.select');
        Route::put('businesses/{business}', [BusinessController::class, 'update'])->name('businesses.update');
        Route::post('businesses/{business}/archive', [BusinessController::class, 'archive'])->name('businesses.archive');
        Route::post('businesses/{business}/restore', [BusinessController::class, 'restore'])->name('businesses.restore');

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
        Route::get('reports/export', [ReportController::class, 'export'])->name('reports.export');
        Route::get('reports/{business}/pdf', [ReportController::class, 'pdf'])->name('reports.pdf');

        Route::get('plans', [PlanController::class, 'index'])->name('plans.index');
        Route::post('plans/trial', [PlanController::class, 'startTrial'])->name('plans.trial');

        Route::middleware(EnsureBillingEnabled::class)->group(function () {
            Route::post('billing/checkout', [BillingController::class, 'checkout'])->name('billing.checkout');
            Route::get('billing/payment/{payment}', [BillingController::class, 'show'])->name('billing.payment.show');
            Route::post('billing/payment/{payment}/simulate', [BillingController::class, 'simulate'])->name('billing.payment.simulate');
            Route::post('billing/cancel', [BillingController::class, 'cancel'])->name('billing.cancel');
        });
    });
});

require __DIR__.'/settings.php';
