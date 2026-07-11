<?php

namespace App\Console\Commands;

use App\Models\Business;
use App\Models\Subscription;
use App\Models\User;
use App\Services\Demo\DemoLoginReadinessService;
use App\Support\DemoAccount;
use Carbon\Carbon;
use Database\Seeders\WattWiseDemoSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Local-only health check for the WattWise demo login flow.
 *
 * Diagnoses whether the demo account can log in and reach the seeded
 * dashboard, and (with --fix) repairs the demo account by reseeding.
 *
 * Safety:
 *  - Runs only in the allowed environments.
 *  - Never prints secrets, .env values, or the password hash.
 *  - --fix is scoped to the demo account via the idempotent demo seeder;
 *    it never truncates tables or touches non-demo users.
 */
class DiagnoseDemoLoginCommand extends Command
{
    protected $signature = 'wattwise:diagnose-demo-login {--fix : Reset the local demo password + email verification and reseed demo data}';

    protected $description = 'Diagnose (and optionally repair) the local demo login flow. Local/testing/staging only; never prints secrets.';

    public function handle(): int
    {
        $demoAllowed = app()->environment('local', 'testing')
            || DemoAccount::enabled();

        if (! $demoAllowed) {
            $this->error(
                'Refusing to run because demo login is disabled. '
                .'Set DEMO_LOGIN_ENABLED=true only on an isolated environment.'
            );

            return self::FAILURE;
        }

        $readinessService = app(DemoLoginReadinessService::class);
        $result = $readinessService->check();

        if (! $result->ready && $this->option('fix')) {
            if (! DemoAccount::environmentAllowed()) {
                $this->error('Refusing to apply --fix in an unsafe environment: '.app()->environment());

                return self::FAILURE;
            }

            $this->info('Applying --fix: reseeding demo data (idempotent, scoped to the demo account)...');
            (new WattWiseDemoSeeder)->run();

            $result = $readinessService->check();
        }

        $this->reportEnvironment();
        $this->reportDemoAccount($result->ready);

        return $result->ready ? self::SUCCESS : self::FAILURE;
    }

    private function reportEnvironment(): void
    {
        $this->newLine();
        $this->info('== Environment ==');
        $this->table(['Key', 'Value'], [
            ['app env', app()->environment()],
            ['app url', (string) config('app.url')],
            ['db driver', (string) config('database.default')],
            ['db name', (string) DB::connection()->getDatabaseName()],
        ]);
    }

    private function reportDemoAccount(bool $isReady): int
    {
        $this->newLine();
        $this->info('== Demo account ==');

        $user = User::where('email', DemoAccount::EMAIL)->first();

        if (! $user) {
            $this->error('Demo user '.DemoAccount::EMAIL.' does NOT exist. Re-run with --fix to create it.');

            return self::FAILURE;
        }

        // Provider-level credential check — exactly what the web login runs.
        // Never prints the hash, only the boolean result.
        $passwordMatches = Hash::check(DemoAccount::PASSWORD, $user->password);
        $authValidates = Auth::validate([
            'email' => DemoAccount::EMAIL,
            'password' => DemoAccount::PASSWORD,
        ]);

        /** @var Business|null $business */
        $business = Business::where('user_id', $user->id)
            ->where('name', DemoAccount::BUSINESS_NAME)
            ->first();

        /** @var Subscription|null $subscription */
        $subscription = $user->subscription;

        $this->table(['Check', 'Result'], [
            ['user exists', 'yes'],
            ['id', (string) $user->id],
            ['name', (string) $user->name],
            ['email', (string) $user->email],
            ['email_verified_at', $user->email_verified_at ? Carbon::parse((string) $user->email_verified_at)->toDateTimeString() : 'null'],
            ['password matches "password"', $passwordMatches ? 'true' : 'false'],
            ['auth pipeline validates', $authValidates ? 'true' : 'false'],
            ['business count', (string) Business::where('user_id', $user->id)->count()],
            [DemoAccount::BUSINESS_NAME.' exists', $business ? 'yes' : 'no'],
            ['electricity entries', (string) ($business?->electricityEntries()->count() ?? 0)],
            ['revenue entries', (string) ($business?->revenueEntries()->count() ?? 0)],
            ['appliances', (string) ($business?->appliances()->count() ?? 0)],
            ['subscription plan', $subscription->plan ?? 'none'],
            ['subscription status', $subscription->status ?? 'none'],
            ['subscription trial_ends_at', ($subscription && $subscription->trial_ends_at) ? Carbon::parse((string) $subscription->trial_ends_at)->toDateTimeString() : 'none'],
        ]);

        $this->newLine();

        if ($isReady) {
            $this->info('Demo login is READY. Log in with '.DemoAccount::EMAIL.' / '.DemoAccount::PASSWORD);
        } else {
            $this->warn('Demo login is NOT ready. Re-run this command with --fix.');
        }

        return $isReady ? self::SUCCESS : self::FAILURE;
    }
}
