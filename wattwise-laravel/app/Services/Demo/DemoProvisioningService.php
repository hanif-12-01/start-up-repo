<?php

namespace App\Services\Demo;

use App\Models\User;
use App\Support\DemoAccount;
use Database\Seeders\WattWiseDemoSeeder;
use Illuminate\Contracts\Cache\Lock;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

final class DemoProvisioningService
{
    public const LOCK_NAME = 'ensure-demo-login-lock';

    public function __construct(
        private readonly DemoLoginReadinessService $demoReadiness,
        private readonly DemoMlScenarioReadinessService $mlReadiness,
    ) {}

    public function provision(): DemoProvisioningResult
    {
        if (! DemoAccount::enabled()) {
            return new DemoProvisioningResult('DEMO_DISABLED', true);
        }

        if (! DemoAccount::environmentAllowed()) {
            return new DemoProvisioningResult('UNSAFE_ENVIRONMENT', false);
        }

        try {
            $demoReadiness = $this->demoReadiness->check();
            if ($demoReadiness->reason === DemoLoginReadinessReason::DatabaseUnavailable) {
                return new DemoProvisioningResult('DATABASE_UNAVAILABLE', false);
            }

            if ($demoReadiness->ready && $this->mlIsReady()) {
                return new DemoProvisioningResult('ALREADY_READY', true);
            }

            $lock = Cache::lock(self::LOCK_NAME, 60);

            return $this->provisionWhileLocked($lock);
        } catch (\Throwable) {
            return new DemoProvisioningResult('REPAIR_FAILED', false);
        }
    }

    private function provisionWhileLocked(Lock $lock): DemoProvisioningResult
    {
        $acquired = false;

        try {
            $acquired = $lock->get();
            if (! $acquired) {
                return new DemoProvisioningResult('LOCK_UNAVAILABLE', false);
            }

            if ($this->isReady()) {
                return new DemoProvisioningResult('ALREADY_READY', true);
            }

            DB::transaction(function (): void {
                (new WattWiseDemoSeeder)->run();
            });

            $demoReadiness = $this->demoReadiness->check();
            if ($demoReadiness->reason === DemoLoginReadinessReason::DatabaseUnavailable) {
                return new DemoProvisioningResult('DATABASE_UNAVAILABLE', false, true);
            }

            if (! $demoReadiness->ready) {
                return new DemoProvisioningResult('REPAIR_FAILED', false, true);
            }

            if (DemoAccount::mlValidationEnabled() && ! $this->mlReadiness->check()->ready) {
                return new DemoProvisioningResult('ML_SCENARIOS_NOT_READY', false, true);
            }

            return new DemoProvisioningResult('PROVISIONED', true, true);
        } finally {
            if ($acquired) {
                $lock->release();
            }
        }
    }

    private function isReady(): bool
    {
        if (! $this->demoReadiness->check()->ready) {
            return false;
        }

        return $this->mlIsReady();
    }

    private function mlIsReady(): bool
    {
        if (! DemoAccount::mlValidationEnabled()) {
            return true;
        }

        $user = User::query()->where('email', DemoAccount::EMAIL)->first();

        return $this->mlReadiness->check($user)->ready;
    }
}
