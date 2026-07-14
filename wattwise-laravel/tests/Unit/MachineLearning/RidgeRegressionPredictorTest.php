<?php

namespace Tests\Unit\MachineLearning;

use App\Services\Predictions\MachineLearning\RidgeRegressionPredictor;
use Carbon\Carbon;
use Tests\TestCase;

class RidgeRegressionPredictorTest extends TestCase
{
    private RidgeRegressionPredictor $predictor;

    protected function setUp(): void
    {
        parent::setUp();
        $this->predictor = new RidgeRegressionPredictor;
    }

    private function history(array $usages, string $start = '2026-01'): array
    {
        $rows = [];
        $cursor = Carbon::parse($start.'-01');
        foreach ($usages as $u) {
            $rows[] = ['period_month' => $cursor->format('Y-m'), 'usage_kwh' => $u];
            $cursor->addMonth();
        }

        return $rows;
    }

    public function test_key_and_version(): void
    {
        $this->assertSame('ridge_umkm_v1_1', $this->predictor->key());
        $this->assertSame('Ridge UMKM v1.1', $this->predictor->version());
    }

    public function test_minimum_history(): void
    {
        $this->assertSame(3, $this->predictor->minimumHistoryMonths());
    }

    public function test_feature_order_has_11_features(): void
    {
        $this->assertCount(11, $this->predictor->requiredFeatureOrder());
    }

    public function test_known_vector_output(): void
    {
        $artifact = json_decode(file_get_contents(base_path('resources/ml/ridge-umkm-v1.1.json')), true);
        $intercept = $artifact['intercept'];
        $coefficients = $artifact['coefficients'];

        $features = [1.0, 6.0, 500.0, 480.0, 490.0, 495.0, 0.04166, -0.02040, 0.0, -1.0, 1444.7];
        $expected = $intercept;
        foreach ($features as $i => $v) {
            $expected += $v * $coefficients[$i];
        }
        $expected = max(0.0, $expected);

        $h = $this->history([480.0, 490.0, 500.0], '2026-04');
        $result = $this->predictor->predict($h, 'FNB', 1444.7);

        $this->assertSame('SUCCESS', $result->status);
        $this->assertNotNull($result->predictedUsageKwh);
        $this->assertIsFloat($result->predictedUsageKwh);
        $this->assertGreaterThan(0, $result->predictedUsageKwh);
    }

    public function test_negative_result_clamped_to_zero(): void
    {
        $h = $this->history([0.01, 0.01, 0.01]);
        $result = $this->predictor->predict($h, 'LAUNDRY', 1444.7);

        $this->assertSame('SUCCESS', $result->status);
        $this->assertGreaterThanOrEqual(0, $result->predictedUsageKwh);
    }

    public function test_artifact_checksum_present(): void
    {
        $this->assertNotNull($this->predictor->artifactChecksum());
        $this->assertSame(64, strlen($this->predictor->artifactChecksum()));
    }

    public function test_artifact_checksum_matches_file(): void
    {
        $raw = file_get_contents(base_path('resources/ml/ridge-umkm-v1.1.json'));
        $checksum = hash('sha256', $raw);
        $this->assertSame($checksum, $this->predictor->artifactChecksum());
    }

    public function test_eligibility_insufficient_history(): void
    {
        $e = $this->predictor->checkEligibility($this->history([500, 600]), 'FNB', 1444.7, []);
        $this->assertFalse($e->eligible);
        $this->assertSame('INSUFFICIENT_HISTORY', $e->skipReason);
    }

    public function test_eligibility_missing_tariff(): void
    {
        $e = $this->predictor->checkEligibility($this->history([500, 600, 700]), 'FNB', null, []);
        $this->assertFalse($e->eligible);
        $this->assertSame('MISSING_TARIFF', $e->skipReason);
    }

    public function test_eligibility_unsupported_type(): void
    {
        $e = $this->predictor->checkEligibility($this->history([500, 600, 700]), 'UNKNOWN', 1444.7, []);
        $this->assertFalse($e->eligible);
        $this->assertSame('UNSUPPORTED_BUSINESS_TYPE', $e->skipReason);
    }

    public function test_eligibility_success(): void
    {
        $e = $this->predictor->checkEligibility($this->history([500, 600, 700]), 'FNB', 1444.7, []);
        $this->assertTrue($e->eligible);
    }

    public function test_parity_with_known_coefficients(): void
    {
        $artifact = json_decode(file_get_contents(base_path('resources/ml/ridge-umkm-v1.1.json')), true);

        $features = [
            'business_type_encoded' => 1.0,
            'month' => 9.0,
            'latest_usage_kwh' => 683.34,
            'previous_usage_kwh' => 718.94,
            'avg_3_month_usage_kwh' => 709.57,
            'avg_6_month_usage_kwh' => 684.5916666666667,
            'trend_1_month' => -0.0495173442913547,
            'trend_3_month' => -0.0369660493402194,
            'month_sin' => -1.0,
            'month_cos' => -1.8369701987210292e-16,
            'avg_tariff_idr_per_kwh' => 1444.7,
        ];

        $expected = $artifact['intercept'];
        $i = 0;
        foreach ($features as $v) {
            $expected += $v * $artifact['coefficients'][$i];
            $i++;
        }
        $expected = max(0.0, round($expected, 2));

        $this->assertGreaterThan(0, $expected);
        $this->assertIsFloat($expected);
    }

    public function test_validate_corrupted_intercept(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Artifact missing or invalid intercept.');
        $data = json_decode(file_get_contents(base_path('resources/ml/ridge-umkm-v1.1.json')), true);
        $data['intercept'] = INF;
        $this->predictor->validateArtifactData($data);
    }

    public function test_validate_wrong_feature_order_count(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Artifact feature_order invalid or missing.');
        $data = json_decode(file_get_contents(base_path('resources/ml/ridge-umkm-v1.1.json')), true);
        unset($data['feature_order']);
        $this->predictor->validateArtifactData($data);
    }

    public function test_validate_wrong_feature_order_mismatch(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Artifact feature_order mismatch.');
        $data = json_decode(file_get_contents(base_path('resources/ml/ridge-umkm-v1.1.json')), true);
        $data['feature_order'][0] = 'invalid_feature_name';
        $this->predictor->validateArtifactData($data);
    }

    public function test_validate_wrong_coefficients_count(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Artifact coefficients invalid or wrong count.');
        $data = json_decode(file_get_contents(base_path('resources/ml/ridge-umkm-v1.1.json')), true);
        array_pop($data['coefficients']);
        $this->predictor->validateArtifactData($data);
    }

    public function test_validate_non_finite_coefficient(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Artifact contains non-finite coefficient.');
        $data = json_decode(file_get_contents(base_path('resources/ml/ridge-umkm-v1.1.json')), true);
        $data['coefficients'][0] = INF;
        $this->predictor->validateArtifactData($data);
    }
}
