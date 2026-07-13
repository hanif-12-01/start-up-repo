<?php

namespace App\Http\Controllers;

use App\Services\TrialActivationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class GettingStartedController extends Controller
{
    public function plan(Request $request): Response|RedirectResponse
    {
        $user = $request->user();

        if ($user->businesses()->exists()) {
            return redirect()->route('dashboard');
        }

        if ($user->initial_plan_selected_at !== null) {
            return redirect()->route('onboarding');
        }

        $trialEligible = app(TrialActivationService::class)->isEligible($user);

        return Inertia::render('GettingStarted/Plan', [
            'trialEligible' => $trialEligible,
        ]);
    }

    public function chooseFree(Request $request): RedirectResponse
    {
        $user = $request->user();

        if ($user->initial_plan_selected_at === null) {
            $user->update(['initial_plan_selected_at' => now()]);
        }

        if ($user->businesses()->exists()) {
            return redirect()->route('dashboard');
        }

        return redirect()->route('onboarding');
    }

    public function chooseTrial(Request $request): RedirectResponse
    {
        $user = $request->user();

        $service = app(TrialActivationService::class);

        $result = DB::transaction(function () use ($user, $service): array {
            $activation = $service->activate($user);

            if ($activation['success'] && $user->initial_plan_selected_at === null) {
                $user->update(['initial_plan_selected_at' => now()]);
            }

            return $activation;
        });

        $type = $result['success'] ? 'success' : 'error';
        Inertia::flash('toast', ['type' => $type, 'message' => $result['message']]);

        if (! $result['success']) {
            return redirect()->route('getting-started.plan')
                ->with('error', $result['message']);
        }

        if ($user->businesses()->exists()) {
            return redirect()->route('dashboard')
                ->with('success', $result['message']);
        }

        return redirect()->route('onboarding')
            ->with('success', $result['message']);
    }
}
