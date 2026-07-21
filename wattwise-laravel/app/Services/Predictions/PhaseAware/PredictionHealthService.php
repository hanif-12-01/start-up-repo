<?php

declare(strict_types=1);

namespace App\Services\Predictions\PhaseAware;

final class PredictionHealthService
{
    public function __construct(
        private readonly PredictionModePolicy $modePolicy,
        private readonly PredictionInferenceGateway $gateway,
    ) {}

    /** @return array<string, bool|string|null|array> */
    public function check(): array
    {
        $state = $this->modePolicy->resolve();
        $connection = (string) config('prediction.queue_connection', 'database');
        $driver = config("queue.connections.{$connection}.driver");
        $queueReady = is_string($driver) && ! in_array($driver, ['sync', 'null'], true);
        $timeout = (int) config('prediction.ml_timeout_ms', 0);
        $endpointConfigured = trim((string) config('prediction.ml_endpoint', '')) !== '';
        $configurationReady = $state->effectiveMode === PredictionMode::OFF
            || ($endpointConfigured && $timeout > 0);

        $service = $state->effectiveMode === PredictionMode::OFF
            ? [
                'reachable' => false,
                'readiness' => 'disabled',
                'inventory' => 'not_checked',
                'code' => 'ML_DISABLED',
            ]
            : $this->gateway->health();

        return [
            'status' => $configurationReady && ($state->effectiveMode === PredictionMode::OFF || $queueReady)
                ? 'ok'
                : 'degraded',
            'configured_mode' => strtoupper($state->configuredMode),
            'effective_mode' => strtoupper($state->effectiveMode->value),
            'configuration' => $configurationReady ? 'ready' : 'not_ready',
            'production_ml_permitted' => $state->productionPermitted,
            'mode_block_reason' => $state->blockReason,
            'queue' => $queueReady ? 'ready' : 'not_ready',
            'inference_service' => [
                'reachable' => $service['reachable'],
                'readiness' => $service['readiness'],
                'inventory' => $service['inventory'],
                'code' => $service['code'],
            ],
        ];
    }
}
