<?php

namespace App\Services\Demo;

final readonly class DemoMlScenarioReadinessResult
{
    /**
     * @param  list<array{business_name: string, expected_history_months: int, actual_history_months: int, expected_phase: string, detected_phase: string, ready: bool}>  $scenarios
     */
    public function __construct(
        public bool $ready,
        public string $code,
        public array $scenarios,
    ) {}
}
