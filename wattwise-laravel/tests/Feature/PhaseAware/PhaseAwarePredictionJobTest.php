<?php

declare(strict_types=1);

namespace Tests\Feature\PhaseAware;

use App\Jobs\RunPhaseAwarePredictionJob;
use App\Models\Business;
use App\Models\ElectricityEntry;
use App\Models\PredictionRun;
use App\Models\User;
use App\Services\Predictions\PhaseAware\InferenceGatewayException;
use App\Services\Predictions\PhaseAware\InferenceResponse;
use App\Services\Predictions\PhaseAware\PredictionInferenceGateway;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

final class PhaseAwarePredictionJobTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'prediction.mode' => 'shadow',
            'prediction.ml_endpoint' => 'http://inference.invalid',
            'prediction.lightgbm_enabled' => true,
            'prediction.nbeats_enabled' => true,
            'prediction.lightgbm_version' => 'lightgbm-test-v1',
            'prediction.nbeats_version' => 'nbeats-test-v1',
            'prediction.queue_connection' => 'database',
            'prediction.queue' => 'predictions',
        ]);
    }

    public function test_electricity_save_queues_execution_and_does_not_run_ml_inline(): void
    {
        Queue::fake();
        [$user, $business] = $this->business();

        $this->actingAs($user)->post(route('electricity.store'), [
            'business_id' => $business->id,
            'period_month' => '2026-01-01',
            'usage_kwh' => 100,
            'tariff_per_kwh' => 1500,
        ])->assertRedirect();

        $this->assertDatabaseHas('electricity_entries', ['business_id' => $business->id]);
        Queue::assertPushedOn('predictions', RunPhaseAwarePredictionJob::class);
        $this->assertDatabaseCount('prediction_runs', 0);
    }

    public function test_off_mode_queues_nothing_and_makes_zero_gateway_calls(): void
    {
        config(['prediction.mode' => 'off']);
        Queue::fake();
        [$user, $business] = $this->business();

        $this->actingAs($user)->post(route('electricity.store'), [
            'business_id' => $business->id,
            'period_month' => '2026-01-01',
            'usage_kwh' => 100,
        ])->assertRedirect();

        Queue::assertNothingPushed();
    }

    public function test_success_is_persisted_with_observability_and_retry_is_idempotent(): void
    {
        [, $business] = $this->business();
        $entry = $this->history($business, 3)->last();
        $gateway = new FakeGateway('success');
        $this->app->instance(PredictionInferenceGateway::class, $gateway);

        $job = new RunPhaseAwarePredictionJob($entry->id);
        $this->app->call([$job, 'handle']);
        $this->app->call([$job, 'handle']);

        $this->assertSame(1, $gateway->calls);
        $this->assertDatabaseCount('prediction_runs', 1);
        $run = PredictionRun::firstOrFail();
        $this->assertSame('H03_05', $run->reporting_phase);
        $this->assertSame('lightgbm', $run->selected_model);
        $this->assertSame('shadow', $run->prediction_mode);
        $this->assertSame('SUCCESS', $run->phase_status);
        $this->assertSame('ELIGIBLE', $run->eligibility_status);
        $this->assertNotNull($run->deterministic_fallback_kwh);
        $this->assertSame(321.5, (float) $run->prediction_output_kwh);
        $this->assertSame(1, $run->modelResults()->count());
    }

    public function test_timeout_unavailable_and_malformed_outputs_fall_back_safely(): void
    {
        foreach (['timeout', 'unavailable', 'malformed'] as $behavior) {
            PredictionRun::query()->delete();
            [, $business] = $this->business();
            $entry = $this->history($business, 3)->last();
            $this->app->instance(PredictionInferenceGateway::class, new FakeGateway($behavior));

            $this->app->call([(new RunPhaseAwarePredictionJob($entry->id)), 'handle']);

            $run = PredictionRun::firstOrFail();
            $this->assertSame('FALLBACK', $run->phase_status);
            $this->assertNotNull($run->deterministic_fallback_kwh);
            $this->assertNull($run->prediction_output_kwh);
        }
    }

    public function test_disabled_model_is_not_eligible_and_uses_fallback_without_http(): void
    {
        config(['prediction.lightgbm_enabled' => false]);
        [, $business] = $this->business();
        $entry = $this->history($business, 3)->last();
        $gateway = new FakeGateway('success');
        $this->app->instance(PredictionInferenceGateway::class, $gateway);

        $this->app->call([(new RunPhaseAwarePredictionJob($entry->id)), 'handle']);

        $run = PredictionRun::firstOrFail();
        $this->assertSame('NOT_ELIGIBLE', $run->phase_status);
        $this->assertSame('MODEL_DISABLED', $run->fallback_reason);
        $this->assertSame(0, $gateway->calls);
    }

    /** @return array{User, Business} */
    private function business(): array
    {
        $user = User::factory()->create();
        $business = Business::create([
            'user_id' => $user->id,
            'name' => 'Phase Test',
            'business_type' => 'FNB',
            'status' => 'ACTIVE',
        ]);

        return [$user, $business];
    }

    /** @return Collection<int, ElectricityEntry> */
    private function history(Business $business, int $months)
    {
        $entries = collect();
        $cursor = Carbon::parse('2026-01-01');
        for ($i = 0; $i < $months; $i++) {
            $entries->push(ElectricityEntry::create([
                'business_id' => $business->id,
                'period_month' => $cursor->format('Y-m-d'),
                'usage_kwh' => 100 + ($i * 10),
                'tariff_per_kwh' => 1500,
            ]));
            $cursor->addMonth();
        }

        return $entries;
    }
}

final class FakeGateway implements PredictionInferenceGateway
{
    public int $calls = 0;

    public function __construct(private readonly string $behavior) {}

    public function predict(array $payload): InferenceResponse
    {
        $this->calls++;
        if ($this->behavior === 'timeout') {
            throw new InferenceGatewayException('INFERENCE_TIMEOUT');
        }
        if ($this->behavior === 'unavailable') {
            throw new InferenceGatewayException('SERVICE_UNAVAILABLE');
        }

        $data = [
            'schema_version' => '1.0',
            'request_id' => $payload['request_id'],
            'status' => 'SUCCESS',
            'selected_model' => $payload['requested_model'],
            'model_version' => $payload['model_version'],
            'reporting_phase' => $payload['reporting_phase'],
            'prediction_kwh' => $this->behavior === 'malformed' ? INF : 321.5,
            'eligibility_status' => 'ELIGIBLE',
            'fallback_reason' => null,
            'inference_latency_ms' => 2.5,
            'artifact_identifier' => 'test/lightgbm.joblib',
            'artifact_sha256' => str_repeat('a', 64),
            'warnings' => [],
            'error_code' => null,
        ];

        return InferenceResponse::fromArray($data, $payload['request_id']);
    }

    public function health(): array
    {
        return ['reachable' => true, 'readiness' => 'ready', 'inventory' => 'available', 'code' => null];
    }
}
