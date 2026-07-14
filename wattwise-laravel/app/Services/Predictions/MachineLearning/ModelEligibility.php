<?php

declare(strict_types=1);

namespace App\Services\Predictions\MachineLearning;

final class ModelEligibility
{
    private function __construct(
        public readonly bool $eligible,
        public readonly ?string $skipReason,
        public readonly ?string $message,
    ) {}

    public static function eligible(): self
    {
        return new self(true, null, null);
    }

    public static function ineligible(string $skipReason, ?string $message = null): self
    {
        return new self(false, $skipReason, $message);
    }
}
