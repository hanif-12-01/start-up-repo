<?php

declare(strict_types=1);

namespace Tests\Feature\PhaseAware;

use Tests\TestCase;

final class PredictionHealthTest extends TestCase
{
    public function test_off_health_is_safe_and_ready_without_network(): void
    {
        config(['prediction.mode' => 'off']);

        $this->getJson('/up/prediction')
            ->assertOk()
            ->assertJson([
                'status' => 'ok',
                'configured_mode' => 'OFF',
                'effective_mode' => 'OFF',
                'configuration' => 'ready',
                'production_ml_permitted' => false,
                'queue' => 'ready',
                'inference_service' => [
                    'reachable' => false,
                    'readiness' => 'disabled',
                    'inventory' => 'not_checked',
                ],
            ]);
    }

    public function test_health_never_exposes_endpoint_or_secrets(): void
    {
        $sentinel = 'sensitive-marker.example.internal';
        config([
            'prediction.mode' => 'off',
            'prediction.ml_endpoint' => 'http://'.$sentinel,
            'database.connections.sqlite.url' => $sentinel,
        ]);

        $content = $this->getJson('/up/prediction')->assertOk()->getContent();

        $this->assertStringNotContainsString($sentinel, $content);
        $this->assertStringNotContainsString('endpoint', strtolower($content));
        $this->assertStringNotContainsString('password', strtolower($content));
        $this->assertStringNotContainsString('database_url', strtolower($content));
    }
}
