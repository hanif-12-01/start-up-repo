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
        $artifact = json_decode(file_get_contents(base_path('resources/ml/gradient-boosting-umkm-v1.json')), true);

        foreach ($samples as $i => $sample) {
            $featureValues = array_values($sample['features']);

            $prediction = $artifact['init_prediction'];
            $lr = $artifact['learning_rate'];
            foreach ($artifact['trees'] as $tree) {
                $prediction += $lr * $this->traverseTree($tree, $featureValues);
            }
            $prediction = max(0.0, round($prediction, 4));
            $expected = $sample['python_pred'];

            $this->assertEqualsWithDelta(
                $expected,
                $prediction,
                0.01,
                "Parity sample {$i}: expected {$expected}, got {$prediction}",
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

    private function traverseTree(array $tree, array $featureVector): float
    {
        $node = 0;
        while (true) {
            $featureIndex = $tree['features'][$node];
            if ($featureIndex === -2 || $tree['children_left'][$node] === -1) {
                return $tree['values'][$node];
            }
            if ($featureVector[$featureIndex] <= $tree['thresholds'][$node]) {
                $node = $tree['children_left'][$node];
            } else {
                $node = $tree['children_right'][$node];
            }
        }
    }
}
