<?php

namespace Tests\Unit\MachineLearning;

use App\Services\Predictions\MachineLearning\GradientBoostingPredictor;
use Carbon\Carbon;
use Tests\TestCase;

class GradientBoostingPredictorTest extends TestCase
{
    private GradientBoostingPredictor $predictor;

    protected function setUp(): void
    {
        parent::setUp();
        $this->predictor = new GradientBoostingPredictor;
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
        $this->assertSame('gradient_boosting_umkm_v1', $this->predictor->key());
        $this->assertSame('Gradient Boosting UMKM v1.0', $this->predictor->version());
    }

    public function test_artifact_checksum_matches_file(): void
    {
        $raw = file_get_contents(base_path('resources/ml/gradient-boosting-umkm-v1.json'));
        $checksum = hash('sha256', $raw);
        $this->assertSame($checksum, $this->predictor->artifactChecksum());
    }

    public function test_parity_against_archived_samples(): void
    {
        $samples = json_decode(file_get_contents(base_path('resources/ml/gb-parity-samples.json')), true);

        foreach ($samples as $i => $sample) {
            $featureValues = array_values($sample['features']);

            $prediction = $this->predictor->predictFeatureVector($featureValues);
            $expected = $sample['python_pred'];

            $this->assertEqualsWithDelta(
                $expected,
                $prediction,
                0.01,
                "Parity sample fixture ID {$i}: expected {$expected}, got {$prediction}",
            );
        }
    }

    public function test_predict_returns_success(): void
    {
        $h = $this->history([500, 600, 700]);
        $result = $this->predictor->predict($h, 'FNB', 1444.7);

        $this->assertSame('SUCCESS', $result->status);
        $this->assertNotNull($result->predictedUsageKwh);
        $this->assertGreaterThan(0, $result->executionDurationMs);
    }

    public function test_eligibility_checks(): void
    {
        $e = $this->predictor->checkEligibility($this->history([500, 600]), 'FNB', 1444.7, []);
        $this->assertFalse($e->eligible);
        $this->assertSame('INSUFFICIENT_HISTORY', $e->skipReason);

        $e = $this->predictor->checkEligibility($this->history([500, 600, 700]), 'FNB', null, []);
        $this->assertFalse($e->eligible);

        $e = $this->predictor->checkEligibility($this->history([500, 600, 700]), 'FNB', 1444.7, []);
        $this->assertTrue($e->eligible);
    }

    public function test_validate_gb_missing_init_prediction(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Artifact missing or invalid init_prediction.');
        $data = json_decode(file_get_contents(base_path('resources/ml/gradient-boosting-umkm-v1.json')), true);
        $data['init_prediction'] = INF;
        $this->predictor->validateArtifactData($data);
    }

    public function test_validate_gb_mismatched_tree_count(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Artifact tree count mismatch.');
        $data = json_decode(file_get_contents(base_path('resources/ml/gradient-boosting-umkm-v1.json')), true);
        array_pop($data['trees']);
        $this->predictor->validateArtifactData($data);
    }

    public function test_validate_gb_cycle_detected(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('has cycle at node');
        $data = json_decode(file_get_contents(base_path('resources/ml/gradient-boosting-umkm-v1.json')), true);
        $data['trees'][0]['children_left'][1] = 0;
        $this->predictor->validateArtifactData($data);
    }

    public function test_validate_gb_leaf_has_children(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('must not have children.');
        $data = json_decode(file_get_contents(base_path('resources/ml/gradient-boosting-umkm-v1.json')), true);
        $data['trees'][0]['features'][3] = -2;
        $data['trees'][0]['children_left'][3] = 1;
        $this->predictor->validateArtifactData($data);
    }

    public function test_validate_gb_internal_node_missing_children(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('must have two valid children.');
        $data = json_decode(file_get_contents(base_path('resources/ml/gradient-boosting-umkm-v1.json')), true);
        $data['trees'][0]['features'][0] = 3;
        $data['trees'][0]['children_left'][0] = -1;
        $this->predictor->validateArtifactData($data);
    }
}
