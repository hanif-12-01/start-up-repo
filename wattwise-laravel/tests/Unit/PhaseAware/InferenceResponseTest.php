<?php

declare(strict_types=1);

namespace Tests\Unit\PhaseAware;

use App\Services\Predictions\PhaseAware\InferenceGatewayException;
use App\Services\Predictions\PhaseAware\InferenceResponse;
use Tests\TestCase;

final class InferenceResponseTest extends TestCase
{
    public function test_strict_success_response_is_accepted(): void
    {
        $response = InferenceResponse::fromArray($this->valid(), 'request-1');
        $this->assertSame(123.45, $response->predictionKwh);
    }

    public function test_malformed_response_triggers_fallback_error(): void
    {
        $data = $this->valid();
        unset($data['warnings']);

        $this->expectException(InferenceGatewayException::class);
        InferenceResponse::fromArray($data, 'request-1');
    }

    public function test_non_finite_prediction_is_rejected(): void
    {
        $data = $this->valid();
        $data['prediction_kwh'] = INF;

        try {
            InferenceResponse::fromArray($data, 'request-1');
            $this->fail('Expected non-finite output rejection.');
        } catch (InferenceGatewayException $exception) {
            $this->assertSame('NON_FINITE_OUTPUT', $exception->category);
        }
    }

    public function test_request_id_mismatch_is_rejected(): void
    {
        $this->expectException(InferenceGatewayException::class);
        InferenceResponse::fromArray($this->valid(), 'different-request');
    }

    /** @return array<string, mixed> */
    private function valid(): array
    {
        return [
            'schema_version' => '1.0',
            'request_id' => 'request-1',
            'status' => 'SUCCESS',
            'selected_model' => 'lightgbm',
            'model_version' => 'lightgbm-test-v1',
            'reporting_phase' => 'H03_05',
            'prediction_kwh' => 123.45,
            'eligibility_status' => 'ELIGIBLE',
            'fallback_reason' => null,
            'inference_latency_ms' => 4.2,
            'artifact_identifier' => 'unseen_entity/lightgbm/17.joblib',
            'artifact_sha256' => str_repeat('a', 64),
            'warnings' => [],
            'error_code' => null,
        ];
    }
}
