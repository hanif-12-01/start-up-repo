<?php

namespace App\Providers;

use App\Contracts\BillingProvider;
use App\Contracts\WhatsAppGateway;
use App\Services\ActiveBusinessResolver;
use App\Services\Billing\SandboxSimulatorProvider;
use App\Services\Billing\UnknownBillingDriverException;
use App\Services\WhatsApp\LogWhatsAppGateway;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(ActiveBusinessResolver::class);

        // Provider-neutral WhatsApp gateway. Only the safe, non-delivering
        // "log" driver exists in this scope; future drivers bind here.
        $this->app->bind(WhatsAppGateway::class, function ($app) {
            return match (config('whatsapp.driver')) {
                default => $app->make(LogWhatsAppGateway::class),
            };
        });

        // Simulation-only billing provider. Any driver other than the sandbox
        // simulator FAILS CLOSED — it never falls back to a real provider.
        $this->app->bind(BillingProvider::class, function ($app) {
            $driver = config('billing.driver');

            return match ($driver) {
                SandboxSimulatorProvider::IDENTIFIER => $app->make(SandboxSimulatorProvider::class),
                default => throw UnknownBillingDriverException::for((string) $driver),
            };
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
