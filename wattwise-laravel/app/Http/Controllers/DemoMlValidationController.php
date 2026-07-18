<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\Demo\DemoMlValidationService;
use App\Support\DemoAccount;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class DemoMlValidationController extends Controller
{
    public function index(Request $request, DemoMlValidationService $service): Response
    {
        $user = $this->authorizedDemoUser($request);

        return Inertia::render('Demo/MlValidation', $service->summarize($user));
    }

    public function run(Request $request, DemoMlValidationService $service): RedirectResponse
    {
        $user = $this->authorizedDemoUser($request);

        try {
            $report = $service->run($user);
        } catch (\RuntimeException $exception) {
            return redirect()
                ->route('demo.ml-validation')
                ->with('error', $exception->getMessage());
        }

        $message = sprintf(
            'Validasi shadow selesai: %d diproses, %d dilewati, %d error.',
            $report['processed'],
            $report['skipped'],
            count($report['errors']),
        );

        if ($report['errors'] !== []) {
            return redirect()
                ->route('demo.ml-validation')
                ->with('error', $message.' '.implode(' | ', $report['errors']));
        }

        return redirect()
            ->route('demo.ml-validation')
            ->with('success', $message);
    }

    private function authorizedDemoUser(Request $request): User
    {
        abort_unless(DemoAccount::mlValidationOperationAllowed(), 404);

        $user = $request->user();
        abort_unless($user instanceof User, 401);
        abort_unless($user->email === DemoAccount::EMAIL, 403);

        return $user;
    }
}
