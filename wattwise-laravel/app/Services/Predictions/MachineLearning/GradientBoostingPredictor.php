<?php

declare(strict_types=1);

namespace App\Services\Predictions\MachineLearning;

use InvalidArgumentException;

final class GradientBoostingPredictor implements PredictionModelInterface
{
    private const ARTIFACT_PATH = 'resources/ml/gradient-boosting-umkm-v1.json';

    private const EXPECTED_FEATURE_COUNT = 11;

    private const ARTIFACT_SHA256 = 'b864713d9c268f2f177f3905de694934758288e2e0a495cec81080d2dfc9d350';

    private ?array $artifact = null;

    public function key(): string
    {
        return 'gradient_boosting_umkm_v1';
    }

    public function version(): string
    {
        return 'Gradient Boosting UMKM v1.0';
    }

    public function minimumHistoryMonths(): int
    {
        return 3;
    }

    public function requiredFeatureOrder(): array
    {
        return [
            'business_type_encoded',
            'month',
            'latest_usage_kwh',
            'previous_usage_kwh',
            'avg_3_month_usage_kwh',
            'avg_6_month_usage_kwh',
            'trend_1_month',
            'trend_3_month',
            'month_sin',
            'month_cos',
            'avg_tariff_idr_per_kwh',
        ];
    }

    public function artifactChecksum(): ?string
    {
        return self::ARTIFACT_SHA256;
    }

    public function checkEligibility(array $history, string $businessType, ?float $tariffPerKwh, array $flags): ModelEligibility
    {
        if (count($history) < $this->minimumHistoryMonths()) {
            return ModelEligibility::ineligible('INSUFFICIENT_HISTORY', 'Gradient Boosting requires at least 3 months of history.');
        }

        if ($tariffPerKwh === null || $tariffPerKwh <= 0) {
            return ModelEligibility::ineligible('MISSING_TARIFF', 'A positive tariff is required.');
        }

        $builder = new TabularFeatureBuilder;
        if (! $builder->isBusinessTypeSupported($businessType)) {
            return ModelEligibility::ineligible('UNSUPPORTED_BUSINESS_TYPE', "Business type '{$businessType}' is not supported.");
        }

        try {
            $this->loadArtifact();
        } catch (\Throwable) {
            return ModelEligibility::ineligible('ARTIFACT_UNHEALTHY', 'Model artifact failed validation.');
        }

        return ModelEligibility::eligible();
    }

    public function predict(array $history, string $businessType, float $tariffPerKwh): ModelPredictionResult
    {
        $start = hrtime(true);

        try {
            $artifact = $this->loadArtifact();
            $builder = new TabularFeatureBuilder;
            $features = $builder->build($history, $businessType, $tariffPerKwh);

            $featureVector = array_values($features);

            $prediction = $artifact['init_prediction'];
            $learningRate = $artifact['learning_rate'];

            foreach ($artifact['trees'] as $tree) {
                $prediction += $learningRate * $this->traverseTree($tree, $featureVector);
            }

            $prediction = max(0.0, $prediction);
            $bill = $prediction * $tariffPerKwh;
            $durationMs = (hrtime(true) - $start) / 1_000_000;

            return ModelPredictionResult::success(
                modelKey: $this->key(),
                modelVersion: $this->version(),
                predictedUsageKwh: round($prediction, 2),
                predictedBillIdr: round($bill, 2),
                featureSnapshot: $features,
                artifactSha256: self::ARTIFACT_SHA256,
                executionDurationMs: $durationMs,
            );
        } catch (\Throwable $e) {
            $durationMs = (hrtime(true) - $start) / 1_000_000;

            return ModelPredictionResult::failed(
                $this->key(),
                $this->version(),
                'RUNTIME_ERROR',
                'Gradient Boosting prediction failed.',
                $durationMs,
            );
        }
    }

    private function traverseTree(array $tree, array $featureVector): float
    {
        $node = 0;

        while (true) {
            $featureIndex = $tree['features'][$node];

            // Leaf node: feature == -2 or no children
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

    private function loadArtifact(): array
    {
        if ($this->artifact !== null) {
            return $this->artifact;
        }

        $path = base_path(self::ARTIFACT_PATH);
        $raw = file_get_contents($path);
        if ($raw === false) {
            throw new InvalidArgumentException('Cannot read Gradient Boosting artifact file.');
        }

        $checksum = hash('sha256', $raw);
        if ($checksum !== self::ARTIFACT_SHA256) {
            throw new InvalidArgumentException('Gradient Boosting artifact checksum mismatch.');
        }

        $data = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);

        if (! isset($data['init_prediction']) || ! is_finite($data['init_prediction'])) {
            throw new InvalidArgumentException('Artifact missing or invalid init_prediction.');
        }
        if (! isset($data['learning_rate']) || ! is_finite($data['learning_rate'])) {
            throw new InvalidArgumentException('Artifact missing or invalid learning_rate.');
        }
        if (! isset($data['feature_order']) || count($data['feature_order']) !== self::EXPECTED_FEATURE_COUNT) {
            throw new InvalidArgumentException('Artifact feature_order invalid or wrong count.');
        }
        if (! isset($data['trees']) || ! is_array($data['trees'])) {
            throw new InvalidArgumentException('Artifact missing trees array.');
        }

        $requiredTreeKeys = ['children_left', 'children_right', 'features', 'thresholds', 'values'];
        foreach ($data['trees'] as $ti => $tree) {
            foreach ($requiredTreeKeys as $k) {
                if (! isset($tree[$k]) || ! is_array($tree[$k])) {
                    throw new InvalidArgumentException("Tree {$ti} missing required array: {$k}");
                }
            }

            $nodeCount = count($tree['features']);
            foreach ($requiredTreeKeys as $k) {
                if (count($tree[$k]) !== $nodeCount) {
                    throw new InvalidArgumentException("Tree {$ti} has mismatched array lengths.");
                }
            }
        }

        $this->artifact = $data;

        return $data;
    }
}
