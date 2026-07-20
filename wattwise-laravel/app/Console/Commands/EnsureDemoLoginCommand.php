<?php

namespace App\Console\Commands;

use App\Services\Demo\DemoProvisioningService;
use App\Support\DemoAccount;
use Illuminate\Console\Command;

final class EnsureDemoLoginCommand extends Command
{
    protected $signature = 'wattwise:ensure-demo-login';

    protected $description = 'Safely provision and verify the demo account in local, testing, or staging.';

    public function __construct(
        private readonly DemoProvisioningService $provisioning,
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        if (! DemoAccount::enabled()) {
            $this->info('DEMO_DISABLED: Demo login is disabled. No action taken.');

            return self::SUCCESS;
        }

        if (! DemoAccount::environmentAllowed()) {
            $this->error('UNSAFE_ENVIRONMENT: Refusing to run in unsafe environment: '.app()->environment());

            return self::FAILURE;
        }

        $this->info('Demo login readiness is being verified. Performing repairs... only if required.');
        $result = $this->provisioning->provision();

        if (! $result->ready) {
            $message = match ($result->status) {
                'LOCK_UNAVAILABLE' => 'Could not acquire atomic lock. Another provisioning process may be running.',
                'ML_SCENARIOS_NOT_READY' => 'ML_SCENARIOS_NOT_READY: Demo scenario verification failed after repair.',
                default => $result->status.': Demo login repair failed.',
            };
            $this->error($message);

            return self::FAILURE;
        }

        if ($result->status === 'ALREADY_READY') {
            $this->info('ALREADY_READY: Demo login is already ready.');
        } else {
            $this->info('PROVISIONED: Demo login has been repaired and is now ready.');
        }

        return self::SUCCESS;
    }
}
