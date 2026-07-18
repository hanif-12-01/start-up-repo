<?php

namespace App\Services\Deployment;

use App\Services\Demo\DemoLoginReadinessService;
use App\Services\Demo\DemoMlScenarioReadinessService;
use App\Support\DemoAccount;
use App\Support\RailwayEnvironment;

final class ReleaseReadinessService
{
    public function __construct(
        private readonly DatabaseRuntimeProbe $databaseProbe,
        private readonly DemoLoginReadinessService $demoReadiness,
        private readonly DemoMlScenarioReadinessService $mlReadiness,
    ) {}

    public function checkInfrastructure(): ReleaseReadinessResult
    {
        $driver = strtolower((string) config('database.default', ''));

        try {
            $database = $this->databaseProbe->probe();
            $driver = $database->driver;
            $databaseName = $database->databaseName;
        } catch (\Throwable) {
            return $this->failed('DATABASE_UNAVAILABLE', $driver, null);
        }

        if (RailwayEnvironment::isManagedDeployment() && $driver === 'sqlite') {
            return $this->failed('RAILWAY_SQLITE_FORBIDDEN', $driver, $databaseName);
        }

        if (RailwayEnvironment::isManagedDeployment() && $driver !== 'pgsql') {
            return $this->failed('RAILWAY_POSTGRES_REQUIRED', $driver, $databaseName);
        }

        if (RailwayEnvironment::isProduction() && DemoAccount::enabled()) {
            return $this->failed('RAILWAY_PRODUCTION_DEMO_FORBIDDEN', $driver, $databaseName);
        }

        if (RailwayEnvironment::isProduction() && DemoAccount::mlValidationEnabled()) {
            return $this->failed('RAILWAY_PRODUCTION_ML_VALIDATION_FORBIDDEN', $driver, $databaseName);
        }

        return new ReleaseReadinessResult(
            true,
            'INFRASTRUCTURE_READY',
            $driver,
            $databaseName,
            DemoAccount::enabled() ? 'required' : 'disabled',
            DemoAccount::mlValidationEnabled() ? 'required' : 'disabled',
        );
    }

    public function check(): ReleaseReadinessResult
    {
        $infrastructure = $this->checkInfrastructure();
        if (! $infrastructure->ready) {
            return $infrastructure;
        }

        try {
            if (DemoAccount::mlValidationEnabled() && ! DemoAccount::enabled()) {
                return $this->failed(
                    'ML_VALIDATION_REQUIRES_DEMO',
                    $infrastructure->databaseDriver,
                    $infrastructure->databaseName,
                );
            }

            $demoState = 'disabled';
            if (DemoAccount::enabled()) {
                if (! $this->demoReadiness->check()->ready) {
                    return new ReleaseReadinessResult(
                        false,
                        'DEMO_NOT_READY',
                        $infrastructure->databaseDriver,
                        $infrastructure->databaseName,
                        'not_ready',
                        DemoAccount::mlValidationEnabled() ? 'not_ready' : 'disabled',
                    );
                }
                $demoState = 'ready';
            }

            $mlState = 'disabled';
            if (DemoAccount::mlValidationEnabled()) {
                if (! $this->mlReadiness->check()->ready) {
                    return new ReleaseReadinessResult(
                        false,
                        'ML_SCENARIOS_NOT_READY',
                        $infrastructure->databaseDriver,
                        $infrastructure->databaseName,
                        $demoState,
                        'not_ready',
                    );
                }
                $mlState = 'ready';
            }

            return new ReleaseReadinessResult(
                true,
                'READY',
                $infrastructure->databaseDriver,
                $infrastructure->databaseName,
                $demoState,
                $mlState,
            );
        } catch (\Throwable) {
            return $this->failed(
                'RELEASE_CHECK_FAILED',
                $infrastructure->databaseDriver,
                $infrastructure->databaseName,
            );
        }
    }

    private function failed(string $code, string $driver, ?string $databaseName): ReleaseReadinessResult
    {
        return new ReleaseReadinessResult(
            false,
            $code,
            $driver,
            $databaseName,
            DemoAccount::enabled() ? 'not_ready' : 'disabled',
            DemoAccount::mlValidationEnabled() ? 'not_ready' : 'disabled',
        );
    }
}
