<?php

declare(strict_types=1);

namespace Tests\Unit\PhaseAware;

use App\Services\Predictions\PhaseAware\HttpPredictionInferenceGateway;
use App\Services\Predictions\PhaseAware\InferenceGatewayException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

final class HttpPredictionInferenceGatewayTest extends TestCase
{
    public function test_timeout_is_mapped_without_leaking_the_endpoint(): void
    {
        Http::fake(fn () => throw new ConnectionException('Operation timed out'));
        $gateway = new HttpPredictionInferenceGateway('http://private.example.test', 25);

        try {
            $gateway->predict(['request_id' => 'request-1']);
            $this->fail('Expected timeout mapping.');
        } catch (InferenceGatewayException $exception) {
            $this->assertSame('INFERENCE_TIMEOUT', $exception->category);
            $this->assertStringNotContainsString('private.example.test', $exception->getMessage());
        }
    }

    public function test_unavailable_status_and_malformed_json_fail_safely(): void
    {
        foreach ([
            Http::response(['status' => 'error'], 503),
            Http::response('not-json', 200, ['Content-Type' => 'text/plain']),
        ] as $response) {
            Http::fake(fn () => $response);
            $gateway = new HttpPredictionInferenceGateway('http://ml.example.test', 25);

            try {
                $gateway->predict(['request_id' => 'request-1']);
                $this->fail('Expected safe gateway failure.');
            } catch (InferenceGatewayException $exception) {
                $this->assertContains(
                    $exception->category,
                    ['SERVICE_UNAVAILABLE', 'MALFORMED_RESPONSE'],
                );
            }
        }
    }

    public function test_health_accepts_reachable_not_ready_service_without_exposing_details(): void
    {
        Http::fake([
            'http://ml.example.test/health' => Http::response([
                'schema_version' => '1.0',
                'status' => 'not_ready',
                'error_code' => 'MANIFEST_MISSING',
            ], 503),
            'http://ml.example.test/v1/models' => Http::response([
                'schema_version' => '1.0',
                'status' => 'not_ready',
                'models' => [],
                'error_code' => 'MANIFEST_MISSING',
            ], 503),
        ]);

        $health = (new HttpPredictionInferenceGateway('http://ml.example.test', 25))->health();

        $this->assertTrue($health['reachable']);
        $this->assertSame('not_ready', $health['readiness']);
        $this->assertSame('not_ready', $health['inventory']);
        $this->assertSame('MANIFEST_MISSING', $health['code']);
        $this->assertStringNotContainsString('ml.example.test', json_encode($health, JSON_THROW_ON_ERROR));
    }
}
