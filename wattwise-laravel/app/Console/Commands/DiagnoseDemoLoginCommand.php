<?php

namespace App\Console\Commands;

use App\Models\Business;
use App\Models\User;
use Database\Seeders\WattWiseDemoSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Local-only health check for the WattWise demo login flow.
 *
 * Diagnoses whether demo@wattwise.local can log in and reach the seeded
 * dashboard, and (with --fix) repairs the demo account by reseeding.
 *
 * Safety:
 *  - Runs only in the local/testing environments.
 *  - Never prints secrets, .env values, or the password hash.
 *  - --fix is scoped to the demo account via the idempotent demo seeder;
 *    it never truncates tables or touches non-demo users.
 */
class DiagnoseDemoLoginCommand extends Command
{
    protected $signature = 'wattwise:diagnose-demo-login {--fix : Reset the local demo password + email verification and reseed demo data}';

    protected $description = 'Diagnose (and optionally repair) the local demo login flow. Local/testing only; never prints secrets.';

    private const DEMO_EMAIL = 'demo@wattwise.local';

    private const DEMO_BUSINESS_NAME = 'Kos Melati Purwokerto';

    private const DEMO_PASSWORD = 'password';

    public function handle(): int
    {
        $demoAllowed = app()->environment('local', 'testing')
            || config('demo.enabled');

        if (! $demoAllowed) {
            $this->error(
                'Refusing to run because demo login is disabled. '
                .'Set DEMO_LOGIN_ENABLED=true only on an isolated staging environment.'
            );

            return self::FAILURE;
        }

        if (! app()->environment('local', 'testing')) {
            $this->warn('WARNING: Demo login is enabled outside local/testing. Do not enable DEMO_LOGIN_ENABLED on a real customer production database containing actual client data.');
        }

        if ($this->option('fix')) {
            $this->info('Applying --fix: reseeding demo data (idempotent, scoped to the demo account)...');
            $this->call('db:seed', [
                '--class' => WattWiseDemoSeeder::class,
                '--force' => true,
            ]);
        }

        $this->reportEnvironment();

        return $this->reportDemoAccount();
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

    private function reportDemoAccount(): int
    {
        $this->newLine();
        $this->info('== Demo account ==');

        $user = User::where('email', self::DEMO_EMAIL)->first();

        if (! $user) {
            $this->error('Demo user '.self::DEMO_EMAIL.' does NOT exist. Re-run with --fix to create it.');

            return self::SUCCESS;
        }

        // Provider-level credential check — exactly what the web login runs.
        // Never prints the hash, only the boolean result.
        $passwordMatches = Hash::check(self::DEMO_PASSWORD, $user->password);
        $authValidates = Auth::validate([
            'email' => self::DEMO_EMAIL,
            'password' => self::DEMO_PASSWORD,
        ]);

        $business = Business::where('user_id', $user->id)
            ->where('name', self::DEMO_BUSINESS_NAME)
            ->first();

        $subscription = $user->subscription;

        $this->table(['Check', 'Result'], [
            ['user exists', 'yes'],
            ['id', (string) $user->id],
            ['name', (string) $user->name],
            ['email', (string) $user->email],
            ['email_verified_at', $user->email_verified_at?->toDateTimeString() ?? 'null'],
            ['password matches "password"', $passwordMatches ? 'true' : 'false'],
            ['auth pipeline validates', $authValidates ? 'true' : 'false'],
            ['business count', (string) Business::where('user_id', $user->id)->count()],
            [self::DEMO_BUSINESS_NAME.' exists', $business ? 'yes' : 'no'],
            ['electricity entries', (string) ($business?->electricityEntries()->count() ?? 0)],
            ['revenue entries', (string) ($business?->revenueEntries()->count() ?? 0)],
            ['appliances', (string) ($business?->appliances()->count() ?? 0)],
            ['subscription plan', $subscription->plan ?? 'none'],
            ['subscription status', $subscription->status ?? 'none'],
            ['subscription trial_ends_at', $subscription?->trial_ends_at?->toDateTimeString() ?? 'none'],
        ]);

        $this->newLine();

        if ($passwordMatches && $authValidates) {
            $this->info('Demo login is READY. Log in with '.self::DEMO_EMAIL.' / '.self::DEMO_PASSWORD);
        } else {
            $this->warn('Demo login is NOT ready. Re-run this command with --fix.');
        }

        return self::SUCCESS;
    }
}
