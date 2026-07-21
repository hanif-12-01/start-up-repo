<?php

declare(strict_types=1);

namespace Tests\Unit\PhaseAware;

use App\Services\Predictions\PhaseAware\InferenceGatewayException;
use App\Services\Predictions\PhaseAware\InferenceResponse;
use Tests\TestCase;

final class InferenceResponseValidationTest extends TestCase
{
    public function test_contract_rejects_missing_extra_unknown_and_blank_fields(): void
    {
        $missing = $this->valid();
        unset($missing['warnings']);
        $extra = [...$this->valid(), 'debug' => true];

        $cases = [
            $missing,
            $extra,
            [...$this->valid(), 'schema_version' => '2.0'],
            [...$this->valid(), 'status' => 'MAYBE'],
            [...$this->valid(), 'eligibility_status' => 'UNKNOWN'],
            [...$this->valid(), 'selected_model' => ' '],
            [...$this->valid(), 'model_version' => ''],
            [...$this->valid(), 'reporting_phase' => ' '],
        ];

        foreach ($cases as $case) {
            $this->assertRejected($case);
        }
    }

    public function test_contract_rejects_non_numeric_non_finite_and_negative_predictions(): void
    {
        foreach (['12.5', NAN, INF, -0.01] as $value) {
            $this->assertRejected(
                [...$this->valid(), 'prediction_kwh' => $value],
                'NON_FINITE_OUTPUT',
            );
        }
    }

    public function test_contract_rejects_invalid_latency_warning_and_nullable_values(): void
    {
        foreach (['3.1', NAN, INF, -1] as $value) {
            $this->assertRejected([...$this->valid(), 'inference_latency_ms' => $value]);
        }

        foreach ([[''], [12], ['named' => 'warning']] as $warnings) {
            $this->assertRejected([...$this->valid(), 'warnings' => $warnings]);
        }

        foreach ([
            ['fallback_reason' => ' '],
            ['error_code' => 12],
            ['artifact_sha256' => 'not-a-checksum'],
            ['artifact_identifier' => 'C:\\private\\model.joblib'],
            ['artifact_identifier' => '../model.joblib'],
        ] as $change) {
            $this->assertRejected([...$this->valid(), ...$change]);
        }
    }

    public function test_contract_rejects_inconsistent_status_fields(): void
    {
        $this->assertRejected([...$this->valid(), 'eligibility_status' => 'NOT_ELIGIBLE']);
        $this->assertRejected([...$this->valid(), 'fallback_reason' => 'SHOULD_BE_NULL']);
        $this->assertRejected([...$this->valid(), 'artifact_identifier' => null]);
        $this->assertRejected([
            ...$this->valid(),
            'status' => 'ERROR',
            'prediction_kwh' => null,
            'fallback_reason' => 'ML_UNAVAILABLE',
            'error_code' => null,
        ]);
    }

    /** @param array<string, mixed> $data */
    private function assertRejected(array $data, ?string $category = null): void
    {
        try {
            InferenceResponse::fromArray($data, 'request-1');
            $this->fail('Expected strict inference response rejection.');
        } catch (InferenceGatewayException $exception) {
            if ($category !== null) {
                $this->assertSame($category, $exception->category);
            } else {
                $this->assertNotSame('', $exception->category);
            }
        }
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
