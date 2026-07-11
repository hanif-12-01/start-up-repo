<?php

namespace App\Services\Demo;

final readonly class DemoLoginReadinessResult
{
    private function __construct(
        public bool $ready,
        public DemoLoginReadinessReason $reason,
    ) {}

    public static function ready(): self
    {
        return new self(true, DemoLoginReadinessReason::Ready);
    }

    public static function failed(DemoLoginReadinessReason $reason): self
    {
        return new self(false, $reason);
    }
}
