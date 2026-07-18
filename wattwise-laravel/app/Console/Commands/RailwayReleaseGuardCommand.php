<?php

namespace App\Console\Commands;

use App\Services\Demo\DemoProvisioningService;
use App\Services\Deployment\ReleaseReadinessResult;
use App\Services\Deployment\ReleaseReadinessService;
use App\Support\DemoAccount;
use App\Support\RailwayEnvironment;
use Illuminate\Console\Command;

final class RailwayReleaseGuardCommand extends Command
{
    protected $signature = 'wattwise:railway-release-guard';

    protected $description = 'Fail-closed database and demo readiness gate for Railway releases.';

    public function __construct(
        private readonly ReleaseReadinessService $readiness,
        private readonly DemoProvisioningService $provisioning,
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $infrastructure = $this->readiness->checkInfrastructure();
        $this->reportContext($infrastructure);

        if (! $infrastructure->ready) {
            $this->error('Release guard: failed ['.$infrastructure->code.']');

            return self::FAILURE;
        }

        if (DemoAccount::enabled()) {
            $provisioning = $this->provisioning->provision();
            $this->line('Demo provisioning: '.$provisioning->status);

            if (! $provisioning->ready) {
                $this->error('Release guard: failed ['.$provisioning->status.']');

                return self::FAILURE;
            }
        }

        $result = $this->readiness->check();
        $this->line('Demo readiness: '.$result->demo);
        $this->line('ML scenario readiness: '.$result->mlValidation);

        if (! $result->ready) {
            $this->error('Release guard: failed ['.$result->code.']');

            return self::FAILURE;
        }

        $this->info('Release guard: passed');

        return self::SUCCESS;
    }

    private function reportContext(ReleaseReadinessResult $result): void
    {
        $this->line('Environment: '.app()->environment());
        $this->line('Railway: '.(RailwayEnvironment::detected() ? 'yes' : 'no'));
        if (RailwayEnvironment::environmentName() !== null) {
            $this->line('Railway environment: '.RailwayEnvironment::environmentName());
        }
        $this->line('Database driver: '.$result->databaseDriver);
        $this->line('Database name: '.($result->databaseName ?? 'unavailable'));
        $this->line('Demo login: '.(DemoAccount::enabled() ? 'enabled' : 'disabled'));
        $this->line('ML validation: '.(DemoAccount::mlValidationEnabled() ? 'enabled' : 'disabled'));
    }
}
