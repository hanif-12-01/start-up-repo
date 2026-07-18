<?php

namespace App\Http\Controllers;

use App\Services\Demo\DemoLoginReadinessService;
use Illuminate\Http\JsonResponse;

final class DemoHealthController extends Controller
{
    public function __invoke(DemoLoginReadinessService $readiness): JsonResponse
    {
        $result = $readiness->check();

        return response()->json([
            'status' => $result->ready ? 'ok' : 'fail',
            'demo' => $result->ready ? 'ready' : 'not_ready',
            'reason' => $result->ready ? null : $result->reason->name,
        ], $result->ready ? 200 : 503);
    }
}
