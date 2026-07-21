<?php

declare(strict_types=1);

namespace App\Services\Predictions\PhaseAware;

final readonly class InferenceResponse
{
    private const KEYS = [
        'artifact_identifier',
        'artifact_sha256',
        'eligibility_status',
        'error_code',
        'fallback_reason',
        'inference_latency_ms',
        'model_version',
        'prediction_kwh',
        'reporting_phase',
        'request_id',
        'schema_version',
        'selected_model',
        'status',
        'warnings',
    ];

    /** @param list<string> $warnings */
    private function __construct(
        public string $requestId,
        public string $status,
        public string $selectedModel,
        public string $modelVersion,
        public string $reportingPhase,
        public ?float $predictionKwh,
        public string $eligibilityStatus,
        public ?string $fallbackReason,
        public float $latencyMs,
        public ?string $artifactIdentifier,
        public ?string $artifactSha256,
        public array $warnings,
        public ?string $errorCode,
    ) {}

    /** @param array<string, mixed> $data */
    public static function fromArray(array $data, string $expectedRequestId): self
    {
        $keys = array_keys($data);
        sort($keys);
        if ($keys !== self::KEYS) {
            throw new InferenceGatewayException('MALFORMED_RESPONSE');
        }

        if (! is_string($data['schema_version']) || $data['schema_version'] !== '1.0') {
            throw new InferenceGatewayException('UNSUPPORTED_SCHEMA');
        }
        if (! is_string($data['request_id'])
            || trim($data['request_id']) === ''
            || $data['request_id'] !== $expectedRequestId) {
            throw new InferenceGatewayException('CONTRACT_MISMATCH');
        }

        if (! in_array($data['status'], ['SUCCESS', 'NOT_ELIGIBLE', 'ERROR'], true)) {
            throw new InferenceGatewayException('MALFORMED_RESPONSE');
        }
        if (! in_array($data['eligibility_status'], ['ELIGIBLE', 'NOT_ELIGIBLE'], true)) {
            throw new InferenceGatewayException('MALFORMED_RESPONSE');
        }

        foreach (['selected_model', 'model_version', 'reporting_phase'] as $field) {
            if (! is_string($data[$field]) || trim($data[$field]) === '') {
                throw new InferenceGatewayException('MALFORMED_RESPONSE');
            }
        }

        $prediction = $data['prediction_kwh'];
        if ($data['status'] === 'SUCCESS') {
            if (! is_int($prediction) && ! is_float($prediction)) {
                throw new InferenceGatewayException('NON_FINITE_OUTPUT');
            }
            $prediction = (float) $prediction;
            if (! is_finite($prediction) || $prediction < 0) {
                throw new InferenceGatewayException('NON_FINITE_OUTPUT');
            }
        } elseif ($prediction !== null) {
            throw new InferenceGatewayException('MALFORMED_RESPONSE');
        }

        $latency = $data['inference_latency_ms'];
        if ((! is_int($latency) && ! is_float($latency))
            || ! is_finite((float) $latency)
            || (float) $latency < 0) {
            throw new InferenceGatewayException('MALFORMED_RESPONSE');
        }

        if (! is_array($data['warnings']) || ! array_is_list($data['warnings'])) {
            throw new InferenceGatewayException('MALFORMED_RESPONSE');
        }
        foreach ($data['warnings'] as $warning) {
            if (! is_string($warning) || trim($warning) === '' || strlen($warning) > 200) {
                throw new InferenceGatewayException('MALFORMED_RESPONSE');
            }
        }

        foreach (['fallback_reason', 'artifact_identifier', 'artifact_sha256', 'error_code'] as $field) {
            if ($data[$field] === null) {
                continue;
            }
            if (! is_string($data[$field]) || trim($data[$field]) === '') {
                throw new InferenceGatewayException('MALFORMED_RESPONSE');
            }
        }

        if ($data['artifact_sha256'] !== null
            && preg_match('/\A[0-9a-f]{64}\z/', $data['artifact_sha256']) !== 1) {
            throw new InferenceGatewayException('MALFORMED_RESPONSE');
        }
        if ($data['artifact_identifier'] !== null
            && ! self::isSafeArtifactIdentifier($data['artifact_identifier'])) {
            throw new InferenceGatewayException('MALFORMED_RESPONSE');
        }

        if ($data['status'] === 'SUCCESS'
            && ($data['eligibility_status'] !== 'ELIGIBLE'
                || $data['fallback_reason'] !== null
                || $data['error_code'] !== null
                || $data['artifact_identifier'] === null
                || $data['artifact_sha256'] === null)) {
            throw new InferenceGatewayException('MALFORMED_RESPONSE');
        }
        if ($data['status'] === 'NOT_ELIGIBLE'
            && ($data['eligibility_status'] !== 'NOT_ELIGIBLE'
                || $data['fallback_reason'] === null
                || $data['error_code'] !== null)) {
            throw new InferenceGatewayException('MALFORMED_RESPONSE');
        }
        if ($data['status'] === 'ERROR'
            && ($data['fallback_reason'] === null || $data['error_code'] === null)) {
            throw new InferenceGatewayException('MALFORMED_RESPONSE');
        }

        return new self(
            $data['request_id'],
            $data['status'],
            $data['selected_model'],
            $data['model_version'],
            $data['reporting_phase'],
            $prediction,
            $data['eligibility_status'],
            $data['fallback_reason'],
            (float) $latency,
            $data['artifact_identifier'],
            $data['artifact_sha256'],
            array_values($data['warnings']),
            $data['error_code'],
        );
    }

    private static function isSafeArtifactIdentifier(string $value): bool
    {
        if (strlen($value) > 255
            || str_starts_with($value, '/')
            || str_contains($value, '\\')
            || str_contains($value, ':')) {
            return false;
        }

        foreach (explode('/', $value) as $segment) {
            if ($segment === '' || $segment === '.' || $segment === '..') {
                return false;
            }
        }

        return true;
    }
}
