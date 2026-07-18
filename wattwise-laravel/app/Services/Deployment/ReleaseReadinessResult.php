<?php

namespace App\Services\Deployment;

final readonly class ReleaseReadinessResult
{
    public function __construct(
        public bool $ready,
        public string $code,
        public string $databaseDriver,
        public ?string $databaseName,
        public string $demo,
        public string $mlValidation,
    ) {}
}
