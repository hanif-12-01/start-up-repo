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
        $continuity = ModelEligibilityResolver::validateHistoryContinuity($history);
        if (! $continuity->eligible) {
            return $continuity;
        }

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
            $builder = new TabularFeatureBuilder;
            $features = $builder->build($history, $businessType, $tariffPerKwh);

            $featureVector = array_values($features);
            $prediction = $this->predictFeatureVector($featureVector);

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

    public function predictFeatureVector(array $featureVector): float
    {
        $artifact = $this->loadArtifact();
        $prediction = $artifact['init_prediction'];
        $learningRate = $artifact['learning_rate'];

        foreach ($artifact['trees'] as $tree) {
            $prediction += $learningRate * $this->traverseTree($tree, $featureVector);
        }

        return $prediction;
    }

    private function traverseTree(array $tree, array $featureVector): float
    {
        $node = 0;
        $steps = 0;
        $maxSteps = count($tree['features']);

        while (true) {
            if ($steps > $maxSteps) {
                throw new InvalidArgumentException("Exceeded maximum tree traversal steps ({$maxSteps}). Cycle or malformed tree structure suspected.");
            }
            $steps++;

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

    private string $artifactPath = self::ARTIFACT_PATH;

    public function setArtifactPath(string $path): void
    {
        $this->artifactPath = $path;
        $this->artifact = null;
    }

    private function loadArtifact(): array
    {
        if ($this->artifact !== null) {
            return $this->artifact;
        }

        $path = base_path($this->artifactPath);
        $raw = file_get_contents($path);
        if ($raw === false) {
            throw new InvalidArgumentException('Cannot read Gradient Boosting artifact file.');
        }

        $checksum = hash('sha256', $raw);
        if ($checksum !== self::ARTIFACT_SHA256) {
            throw new InvalidArgumentException('Gradient Boosting artifact checksum mismatch.');
        }

        $data = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);

        $this->validateArtifactData($data);

        $this->artifact = $data;

        return $data;
    }

    public function validateArtifactData(array $data): void
    {
        if (! isset($data['init_prediction']) || ! is_finite((float) $data['init_prediction'])) {
            throw new InvalidArgumentException('Artifact missing or invalid init_prediction.');
        }
        if (! isset($data['learning_rate']) || ! is_finite((float) $data['learning_rate'])) {
            throw new InvalidArgumentException('Artifact missing or invalid learning_rate.');
        }
        if (! isset($data['n_estimators']) || $data['n_estimators'] !== 200) {
            throw new InvalidArgumentException('Artifact n_estimators mismatch or missing.');
        }
        if (! isset($data['trees']) || ! is_array($data['trees']) || count($data['trees']) !== 200) {
            throw new InvalidArgumentException('Artifact tree count mismatch.');
        }
        if (! isset($data['feature_order']) || ! is_array($data['feature_order'])) {
            throw new InvalidArgumentException('Artifact feature_order invalid or missing.');
        }
        if ($data['feature_order'] !== $this->requiredFeatureOrder()) {
            throw new InvalidArgumentException('Artifact feature_order mismatch.');
        }

        $seenFeatures = [];
        foreach ($data['feature_order'] as $f) {
            if (! is_string($f) || trim($f) === '') {
                throw new InvalidArgumentException('Feature name in feature_order must be a non-empty string.');
            }
            if (isset($seenFeatures[$f])) {
                throw new InvalidArgumentException('Duplicate feature name in feature_order.');
            }
            $seenFeatures[$f] = true;
        }

        $requiredTreeKeys = ['children_left', 'children_right', 'features', 'thresholds', 'values'];
        foreach ($data['trees'] as $ti => $tree) {
            foreach ($requiredTreeKeys as $k) {
                if (! isset($tree[$k]) || ! is_array($tree[$k])) {
                    throw new InvalidArgumentException("Tree {$ti} missing required array: {$k}");
                }
            }

            $nodeCount = count($tree['features']);
            if ($nodeCount <= 0) {
                throw new InvalidArgumentException("Tree {$ti} must have node count greater than zero.");
            }

            foreach ($requiredTreeKeys as $k) {
                if (count($tree[$k]) !== $nodeCount) {
                    throw new InvalidArgumentException("Tree {$ti} has mismatched array lengths.");
                }
            }

            $visited = [];
            $inPath = [];
            $dfs = function (int $node) use (&$dfs, &$visited, &$inPath, $tree, $nodeCount, $ti) {
                if ($node < 0 || $node >= $nodeCount) {
                    throw new InvalidArgumentException("Tree {$ti} has invalid node index: {$node}");
                }
                if (isset($inPath[$node])) {
                    throw new InvalidArgumentException("Tree {$ti} has cycle at node {$node}.");
                }
                if (isset($visited[$node])) {
                    throw new InvalidArgumentException("Tree {$ti} has duplicate parent reference to node {$node}.");
                }
                $visited[$node] = true;

                $featureIndex = $tree['features'][$node];
                if ($featureIndex === -2) {
                    if ($tree['children_left'][$node] !== -1 || $tree['children_right'][$node] !== -1) {
                        throw new InvalidArgumentException("Tree {$ti} leaf node {$node} must not have children.");
                    }
                    if (! is_finite((float) $tree['values'][$node])) {
                        throw new InvalidArgumentException("Tree {$ti} leaf node {$node} has non-finite value.");
                    }
                } else {
                    if ($featureIndex < 0 || $featureIndex > 10) {
                        throw new InvalidArgumentException("Tree {$ti} internal node {$node} has invalid feature index: {$featureIndex}");
                    }
                    $left = $tree['children_left'][$node];
                    $right = $tree['children_right'][$node];
                    if ($left === -1 || $right === -1 || $left === $node || $right === $node) {
                        throw new InvalidArgumentException("Tree {$ti} internal node {$node} must have two valid children.");
                    }
                    if (! is_finite((float) $tree['thresholds'][$node])) {
                        throw new InvalidArgumentException("Tree {$ti} internal node {$node} has non-finite threshold.");
                    }

                    $inPath[$node] = true;
                    $dfs($left);
                    $dfs($right);
                    unset($inPath[$node]);
                }
            };
            $dfs(0);

            if (count($visited) !== $nodeCount) {
                throw new InvalidArgumentException("Tree {$ti} contains unreachable nodes.");
            }
        }
    }
}
