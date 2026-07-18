<?php

namespace App\Console\Commands;

use App\Models\Business;
use App\Models\User;
use App\Services\Demo\DemoLoginReadinessService;
use App\Services\Demo\DemoMlScenarioReadinessService;
use App\Services\Demo\DemoProvisioningService;
use App\Services\Deployment\DatabaseRuntimeProbe;
use App\Support\DemoAccount;
use App\Support\RailwayEnvironment;
use Illuminate\Console\Command;

final class DiagnoseDemoLoginCommand extends Command
{
    protected $signature = 'wattwise:diagnose-demo-login {--fix : Repair demo-owned data through the central provisioning service}';

    protected $description = 'Safely diagnose demo login and ML scenario readiness without exposing credentials.';

    public function __construct(
        private readonly DemoLoginReadinessService $demoReadiness,
        private readonly DemoMlScenarioReadinessService $mlReadiness,
        private readonly DemoProvisioningService $provisioning,
        private readonly DatabaseRuntimeProbe $databaseProbe,
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $demoAllowed = app()->environment('local', 'testing') || DemoAccount::enabled();
        if (! $demoAllowed) {
            $this->error('Refusing to run because demo login is disabled. Enable it only in an isolated staging environment.');

            return self::FAILURE;
        }

        $result = $this->demoReadiness->check();

        if (! $result->ready && $this->option('fix')) {
            if (! DemoAccount::environmentAllowed()) {
                $this->error('Refusing to apply --fix in an unsafe environment: '.app()->environment());

                return self::FAILURE;
            }

            $this->info('Applying --fix through the scoped, idempotent demo provisioning service...');
            $provisioning = $this->provisioning->provision();
            if (! $provisioning->ready) {
                $this->error('Demo repair failed ['.$provisioning->status.'].');
            }
            $result = $this->demoReadiness->check();
        }

        if (! $this->reportEnvironment()) {
            return self::FAILURE;
        }

        $this->reportDemoAccount($result->ready);

        $mlReady = true;
        if (DemoAccount::mlValidationEnabled()) {
            $mlReady = $this->reportMlScenarios();
        }

        return $result->ready && $mlReady ? self::SUCCESS : self::FAILURE;
    }

    private function reportEnvironment(): bool
    {
        $this->newLine();
        $this->info('== Environment ==');

        try {
            $database = $this->databaseProbe->probe();
            $driver = $database->driver;
            $databaseName = $database->databaseName ?? 'unavailable';

            $this->table(['Key', 'Value'], [
                ['app env', app()->environment()],
                ['Railway', RailwayEnvironment::detected() ? 'yes' : 'no'],
                ['Railway environment', RailwayEnvironment::environmentName() ?? 'none'],
                ['db driver', $driver],
                ['db name', $databaseName],
            ]);

            if (RailwayEnvironment::isManagedDeployment() && $driver === 'sqlite') {
                $this->error('RAILWAY_SQLITE_FORBIDDEN: Railway staging/production must use persistent PostgreSQL.');

                return false;
            }

            return true;
        } catch (\Throwable) {
            $this->error('DATABASE_UNAVAILABLE: Unable to establish the configured database connection.');

            return false;
        }
    }

    private function reportDemoAccount(bool $isReady): void
    {
        $this->newLine();
        $this->info('== Demo account ==');

        $user = User::query()->where('email', DemoAccount::EMAIL)->first();
        if ($user === null) {
            $this->error('Demo user does NOT exist. Re-run with --fix in an allowed environment.');

            return;
        }

        $business = Business::query()
            ->where('user_id', $user->id)
            ->where('name', DemoAccount::BUSINESS_NAME)
            ->first();
        $subscription = $user->subscription;

        $this->table(['Check', 'Result'], [
            ['user exists', 'yes'],
            ['email verified', $user->email_verified_at ? 'yes' : 'no'],
            ['initial plan selected', $user->initial_plan_selected_at ? 'yes' : 'no'],
            ['credential verification', $isReady ? 'ready' : 'not_ready'],
            ['business count', (string) $user->businesses()->count()],
            [DemoAccount::BUSINESS_NAME.' exists', $business ? 'yes' : 'no'],
            ['electricity entries', (string) ($business?->electricityEntries()->count() ?? 0)],
            ['revenue entries', (string) ($business?->revenueEntries()->count() ?? 0)],
            ['appliances', (string) ($business?->appliances()->count() ?? 0)],
            ['subscription plan', $subscription->plan ?? 'none'],
            ['subscription status', $subscription->status ?? 'none'],
        ]);

        $isReady
            ? $this->info('Demo login is READY.')
            : $this->warn('Demo login is NOT ready. Re-run this command with --fix.');
    }

    private function reportMlScenarios(): bool
    {
        $result = $this->mlReadiness->check();
        $this->newLine();
        $this->info('== ML scenarios ==');
        $this->table(
            ['Business', 'History', 'Expected phase', 'Detected phase', 'Ready'],
            array_map(fn (array $scenario): array => [
                $scenario['business_name'],
                $scenario['actual_history_months'].'/'.$scenario['expected_history_months'],
                $scenario['expected_phase'],
                $scenario['detected_phase'],
                $scenario['ready'] ? 'yes' : 'no',
            ], $result->scenarios),
        );

        $this->line('ML scenario readiness: '.($result->ready ? 'ready' : 'not_ready'));

        return $result->ready;
    }
}
