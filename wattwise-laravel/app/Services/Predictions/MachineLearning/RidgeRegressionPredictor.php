<?php

declare(strict_types=1);

namespace App\Services\Predictions\MachineLearning;

use InvalidArgumentException;

final class RidgeRegressionPredictor implements PredictionModelInterface
{
    private const ARTIFACT_PATH = 'resources/ml/ridge-umkm-v1.1.json';

    private const EXPECTED_FEATURE_COUNT = 11;

    private const ARTIFACT_SHA256 = 'e2416ba03144094df87d94f269eb60fbec92b68f4441e95342c7a47aa3e615a9';

    private ?array $artifact = null;

    public function key(): string
    {
        return 'ridge_umkm_v1_1';
    }

    public function version(): string
    {
        return 'Ridge UMKM v1.1';
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
            return ModelEligibility::ineligible('INSUFFICIENT_HISTORY', 'Ridge requires at least 3 months of history.');
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

            $intercept = $artifact['intercept'];
            $coefficients = $artifact['coefficients'];

            $prediction = $intercept;
            $i = 0;
            foreach ($features as $value) {
                $prediction += $value * $coefficients[$i];
                $i++;
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
                'Ridge regression prediction failed.',
                $durationMs,
            );
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
            throw new InvalidArgumentException('Cannot read Ridge artifact file.');
        }

        $checksum = hash('sha256', $raw);
        if ($checksum !== self::ARTIFACT_SHA256) {
            throw new InvalidArgumentException('Ridge artifact checksum mismatch.');
        }

        $data = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);

        $this->validateArtifactData($data);

        $this->artifact = $data;

        return $data;
    }

    public function validateArtifactData(array $data): void
    {
        if (! isset($data['intercept']) || ! is_finite((float) $data['intercept'])) {
            throw new InvalidArgumentException('Artifact missing or invalid intercept.');
        }
        if (! isset($data['coefficients']) || ! is_array($data['coefficients']) || count($data['coefficients']) !== self::EXPECTED_FEATURE_COUNT) {
            throw new InvalidArgumentException('Artifact coefficients invalid or wrong count.');
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

        foreach ($data['coefficients'] as $c) {
            if (! is_finite((float) $c)) {
                throw new InvalidArgumentException('Artifact contains non-finite coefficient.');
            }
        }
    }
}
