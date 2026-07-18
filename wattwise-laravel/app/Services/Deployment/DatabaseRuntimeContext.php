<?php

namespace App\Services\Deployment;

final readonly class DatabaseRuntimeContext
{
    public function __construct(
        public string $driver,
        public ?string $databaseName,
    ) {}
}
