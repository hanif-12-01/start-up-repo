<?php

namespace App\Services\Demo;

final readonly class DemoProvisioningResult
{
    public function __construct(
        public string $status,
        public bool $ready,
        public bool $mutated = false,
    ) {}
}
