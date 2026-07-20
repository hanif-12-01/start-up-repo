<?php

namespace App\Http\Controllers;

use App\Services\Deployment\ReleaseReadinessService;
use Illuminate\Http\JsonResponse;

final class ReleaseHealthController extends Controller
{
    public function __invoke(ReleaseReadinessService $readiness): JsonResponse
    {
        try {
            $result = $readiness->check();
        } catch (\Throwable) {
            return response()->json([
                'status' => 'fail',
                'code' => 'RELEASE_CHECK_FAILED',
            ], 503);
        }

        if (! $result->ready) {
            return response()->json([
                'status' => 'fail',
                'code' => $result->code,
            ], 503);
        }

        return response()->json([
            'status' => 'ok',
            'database' => 'ready',
            'demo' => $result->demo,
            'ml_validation' => $result->mlValidation,
        ]);
    }
}
