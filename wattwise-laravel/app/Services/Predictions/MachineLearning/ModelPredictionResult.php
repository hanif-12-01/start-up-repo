<?php

declare(strict_types=1);

namespace App\Services\Predictions\MachineLearning;

final class ModelPredictionResult
{
    public function __construct(
        public readonly string $modelKey,
        public readonly string $modelVersion,
        public readonly string $status,
        public readonly ?float $predictedUsageKwh,
        public readonly ?float $predictedBillIdr,
        public readonly ?array $featureSnapshot,
        public readonly ?string $artifactSha256,
        public readonly float $executionDurationMs,
        public readonly ?string $skipReason,
        public readonly ?string $failureCode,
        public readonly ?string $safeFailureMessage,
    ) {}

    public static function success(
        string $modelKey,
        string $modelVersion,
        float $predictedUsageKwh,
        ?float $predictedBillIdr,
        ?array $featureSnapshot,
        ?string $artifactSha256,
        float $executionDurationMs,
    ): self {
        return new self(
            modelKey: $modelKey,
            modelVersion: $modelVersion,
            status: 'SUCCESS',
            predictedUsageKwh: $predictedUsageKwh,
            predictedBillIdr: $predictedBillIdr,
            featureSnapshot: $featureSnapshot,
            artifactSha256: $artifactSha256,
            executionDurationMs: $executionDurationMs,
            skipReason: null,
            failureCode: null,
            safeFailureMessage: null,
        );
    }

    public static function skipped(
        string $modelKey,
        string $modelVersion,
        string $skipReason,
        float $executionDurationMs,
    ): self {
        return new self(
            modelKey: $modelKey,
            modelVersion: $modelVersion,
            status: 'SKIPPED',
            predictedUsageKwh: null,
            predictedBillIdr: null,
            featureSnapshot: null,
            artifactSha256: null,
            executionDurationMs: $executionDurationMs,
            skipReason: $skipReason,
            failureCode: null,
            safeFailureMessage: null,
        );
    }

    public static function failed(
        string $modelKey,
        string $modelVersion,
        string $failureCode,
        string $safeFailureMessage,
        float $executionDurationMs,
    ): self {
        return new self(
            modelKey: $modelKey,
            modelVersion: $modelVersion,
            status: 'FAILED',
            predictedUsageKwh: null,
            predictedBillIdr: null,
            featureSnapshot: null,
            artifactSha256: null,
            executionDurationMs: $executionDurationMs,
            skipReason: null,
            failureCode: $failureCode,
            safeFailureMessage: $safeFailureMessage,
        );
    }
}
