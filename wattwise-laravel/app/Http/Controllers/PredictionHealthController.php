<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\Predictions\PhaseAware\PredictionHealthService;
use Illuminate\Http\JsonResponse;

final class PredictionHealthController extends Controller
{
    public function __invoke(PredictionHealthService $health): JsonResponse
    {
        try {
            return response()->json($health->check());
        } catch (\Throwable) {
            return response()->json(['status' => 'fail', 'code' => 'PREDICTION_HEALTH_FAILED'], 503);
        }
    }
}
