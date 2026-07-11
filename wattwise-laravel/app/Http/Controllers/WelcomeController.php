<?php

namespace App\Http\Controllers;

use App\Services\Demo\DemoLoginReadinessService;
use Inertia\Inertia;
use Inertia\Response;

class WelcomeController extends Controller
{
    public function __invoke(DemoLoginReadinessService $readiness): Response
    {
        return Inertia::render('Welcome', [
            'demo' => $readiness->publicState(),
        ]);
    }
}
