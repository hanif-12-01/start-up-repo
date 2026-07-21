<?php

declare(strict_types=1);

namespace App\Services\Predictions\PhaseAware;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

final class HttpPredictionInferenceGateway implements PredictionInferenceGateway
{
    public function __construct(
        private readonly string $endpoint,
        private readonly int $timeoutMs,
    ) {}

    public function predict(array $payload): InferenceResponse
    {
        try {
            $response = Http::acceptJson()
                ->timeout(max(0.001, $this->timeoutMs / 1000))
                ->connectTimeout(max(0.001, min($this->timeoutMs, 500) / 1000))
                ->post($this->url('/v1/predictions'), $payload);
        } catch (ConnectionException $e) {
            $category = str_contains(strtolower($e->getMessage()), 'timed out')
                ? 'INFERENCE_TIMEOUT'
                : 'SERVICE_UNAVAILABLE';
            throw new InferenceGatewayException($category, previous: $e);
        } catch (\Throwable $e) {
            throw new InferenceGatewayException('SERVICE_UNAVAILABLE', previous: $e);
        }

        if (! $response->successful()) {
            throw new InferenceGatewayException('SERVICE_UNAVAILABLE');
        }

        $data = $response->json();
        if (! is_array($data)) {
            throw new InferenceGatewayException('MALFORMED_RESPONSE');
        }

        return InferenceResponse::fromArray($data, (string) ($payload['request_id'] ?? ''));
    }

    public function health(): array
    {
        try {
            $health = Http::acceptJson()
                ->timeout(max(0.001, $this->timeoutMs / 1000))
                ->get($this->url('/health'));
            if (! in_array($health->status(), [200, 503], true)) {
                return $this->unavailable('SERVICE_NOT_READY');
            }
            $healthData = $health->json();
            if (! $this->validServicePayload($healthData, false)) {
                return $this->unavailable('MALFORMED_HEALTH_RESPONSE', true);
            }

            $inventory = Http::acceptJson()
                ->timeout(max(0.001, $this->timeoutMs / 1000))
                ->get($this->url('/v1/models'));
            $inventoryData = $inventory->json();
            if (! in_array($inventory->status(), [200, 503], true)
                || ! $this->validServicePayload($inventoryData, true)) {
                return $this->unavailable('MODEL_INVENTORY_UNAVAILABLE', true);
            }

            return [
                'reachable' => true,
                'readiness' => $healthData['status'] === 'ready' ? 'ready' : 'not_ready',
                'inventory' => $inventoryData['status'] === 'ready' ? 'available' : 'not_ready',
                'code' => $healthData['error_code'] ?? $inventoryData['error_code'],
            ];
        } catch (\Throwable) {
            return $this->unavailable('SERVICE_UNAVAILABLE');
        }
    }

    private function url(string $path): string
    {
        return rtrim($this->endpoint, '/').$path;
    }

    private function validServicePayload(mixed $data, bool $inventory): bool
    {
        if (! is_array($data)) {
            return false;
        }

        $expected = $inventory
            ? ['error_code', 'models', 'schema_version', 'status']
            : ['error_code', 'schema_version', 'status'];
        $keys = array_keys($data);
        sort($keys);
        if ($keys !== $expected
            || $data['schema_version'] !== '1.0'
            || ! in_array($data['status'], ['ready', 'not_ready'], true)
            || ($data['error_code'] !== null
                && (! is_string($data['error_code']) || trim($data['error_code']) === ''))
            || ($data['status'] === 'ready' && $data['error_code'] !== null)
            || ($data['status'] === 'not_ready' && $data['error_code'] === null)) {
            return false;
        }

        if (! $inventory) {
            return true;
        }
        if (! is_array($data['models']) || ! array_is_list($data['models'])) {
            return false;
        }

        foreach ($data['models'] as $model) {
            if (! is_array($model)) {
                return false;
            }
            $modelKeys = array_keys($model);
            sort($modelKeys);
            if ($modelKeys !== [
                'artifact_identifier',
                'artifact_sha256',
                'model',
                'readiness',
                'version',
            ]) {
                return false;
            }
            foreach (['artifact_identifier', 'model', 'readiness', 'version'] as $field) {
                if (! is_string($model[$field]) || trim($model[$field]) === '') {
                    return false;
                }
            }
            if ($model['readiness'] !== 'ready'
                || ! is_string($model['artifact_sha256'])
                || preg_match('/\A[0-9a-f]{64}\z/', $model['artifact_sha256']) !== 1) {
                return false;
            }
        }

        return true;
    }

    /** @return array{reachable: bool, readiness: string, inventory: string, code: string} */
    private function unavailable(string $code, bool $reachable = false): array
    {
        return [
            'reachable' => $reachable,
            'readiness' => 'not_ready',
            'inventory' => 'unavailable',
            'code' => $code,
        ];
    }
}
