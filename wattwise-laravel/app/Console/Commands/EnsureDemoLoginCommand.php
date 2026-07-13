<?php

namespace App\Console\Commands;

use App\Models\Business;
use App\Models\Subscription;
use App\Models\User;
use App\Services\Demo\DemoLoginReadinessResult;
use App\Services\Demo\DemoLoginReadinessService;
use App\Support\DemoAccount;
use Carbon\Carbon;
use Database\Seeders\WattWiseDemoSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Console command to ensure the demo login flow is ready.
 * Scoped safely, locking protected, and idempotent.
 */
class EnsureDemoLoginCommand extends Command
{
    protected $signature = 'wattwise:ensure-demo-login';

    protected $description = 'Ensure the demo account and baseline data are ready and healthy. Allowed environments only.';

    public function handle(): int
    {
        // 1. If demo is disabled: no mutation, return SUCCESS.
        if (! DemoAccount::enabled()) {
            $this->info('Demo login is disabled. No action taken.');

            return self::SUCCESS;
        }

        // 2. If unsafe environment: no mutation, return FAILURE.
        if (! DemoAccount::environmentAllowed()) {
            $this->error('Refusing to run in unsafe environment: '.app()->environment());

            return self::FAILURE;
        }

        $readinessService = app(DemoLoginReadinessService::class);
        $result = $readinessService->check();

        // 3. If already ready: no mutation, return SUCCESS.
        if ($result->ready) {
            $this->info('Demo login is already ready.');

            return self::SUCCESS;
        }

        // 4. Broken but allowed: acquire a named cache lock
        try {
            $lock = Cache::lock('ensure-demo-login-lock', 60);

            try {
                if ($lock->get()) {
                    // Re-check readiness after acquiring the lock
                    $result = $readinessService->check();
                    if ($result->ready) {
                        $this->info('Demo login is already ready (verified after acquiring lock).');

                        return self::SUCCESS;
                    }

                    $this->info('Demo login is not ready. Performing repairs...');
                    $this->repair($result);

                    // Verify readiness again
                    $result = $readinessService->check();
                    if ($result->ready) {
                        $this->info('Demo login has been repaired and is now ready.');

                        return self::SUCCESS;
                    }

                    $this->error('Repairs completed but demo login is still not ready.');

                    return self::FAILURE;
                } else {
                    $this->error('Could not acquire atomic lock. Another process may be running ensure command.');

                    return self::FAILURE;
                }
            } catch (\Throwable $e) {
                $this->error('An error occurred during repairs: '.$e->getMessage());

                return self::FAILURE;
            } finally {
                $lock->release();
            }
        } catch (\Throwable $e) {
            $this->error('Lock acquisition failed: '.$e->getMessage());

            return self::FAILURE;
        }
    }

    private function repair(DemoLoginReadinessResult $result): void
    {
        $user = User::where('email', DemoAccount::EMAIL)->first();

        // 1. Missing user or missing full baseline
        if (! $user) {
            $this->callSeeder();

            return;
        }

        // 5. Missing individual baseline relation (business, profile, electricity, etc.)
        /** @var Business|null $business */
        $business = $user->businesses()
            ->where('name', DemoAccount::BUSINESS_NAME)
            ->first();

        if (! $business) {
            $this->callSeeder();

            return;
        }

        $needsSeeder = ! $business->businessProfile()->exists()
            || ! $business->electricityProfile()->exists()
            || $business->electricityEntries()->count() < DemoAccount::MIN_ELECTRICITY_ENTRIES
            || $business->revenueEntries()->count() < DemoAccount::MIN_REVENUE_ENTRIES
            || $business->appliances()->count() < DemoAccount::MIN_APPLIANCES;

        if ($needsSeeder) {
            $this->callSeeder();

            return;
        }

        DB::transaction(function () use ($user, $business) {
            // 2. Stale password
            if (! Hash::check(DemoAccount::PASSWORD, $user->password)) {
                $user->password = Hash::make(DemoAccount::PASSWORD);
                $user->save();
            }

            // 3. Missing email verification
            if ($user->email_verified_at === null) {
                $user->forceFill(['email_verified_at' => now()])->save();
            }

            // 3b. Missing initial plan selection timestamp
            if ($user->initial_plan_selected_at === null) {
                $user->initial_plan_selected_at = \Illuminate\Support\Carbon::now();
                $user->save();
            }

            // 4. Missing or unusable subscription
            /** @var Subscription|null $subscription */
            $subscription = $user->subscription;
            $trialEnds = $subscription && $subscription->trial_ends_at ? Carbon::parse((string) $subscription->trial_ends_at) : null;
            $periodEnds = $subscription && $subscription->current_period_ends_at ? Carbon::parse((string) $subscription->current_period_ends_at) : null;

            if (! $subscription ||
                strtoupper($subscription->plan) !== DemoAccount::SUBSCRIPTION_PLAN ||
                strtoupper($subscription->status) !== 'ACTIVE' ||
                ($trialEnds?->isFuture() !== true && $periodEnds?->isFuture() !== true)
            ) {
                Subscription::updateOrCreate(
                    ['user_id' => $user->id],
                    [
                        'plan' => DemoAccount::SUBSCRIPTION_PLAN,
                        'status' => 'ACTIVE',
                        'trial_starts_at' => now(),
                        'trial_ends_at' => now()->addDays(30),
                        'current_period_starts_at' => now(),
                        'current_period_ends_at' => now()->addDays(30),
                        'metadata' => ['source' => 'demo_repair', 'note' => 'Repaired demo subscription'],
                    ]
                );
            }

            if ($business->status !== Business::STATUS_ACTIVE) {
                $business->status = Business::STATUS_ACTIVE;
                $business->save();
            }
        });
    }

    private function callSeeder(): void
    {
        (new WattWiseDemoSeeder)->run();
    }
}
