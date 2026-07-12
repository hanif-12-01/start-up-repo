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
use RuntimeException;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(ActiveBusinessResolver::class);

        $this->app->bind(WhatsAppGateway::class, function ($app) {
            return match (config('whatsapp.driver')) {
                default => $app->make(LogWhatsAppGateway::class),
            };
        });

        $this->app->bind(BillingProvider::class, function ($app) {
            if (! config('billing.enabled')) {
                throw new RuntimeException('Billing is disabled. Set BILLING_ENABLED=true to use sandbox billing.');
            }

            if ($app->environment('production')) {
                throw new RuntimeException('Sandbox billing cannot be used in production.');
            }

            $driver = config('billing.driver');

            return match ($driver) {
                'sandbox' => $app->make(SandboxSimulatorProvider::class),
                'disabled' => throw new RuntimeException('Billing driver is set to disabled.'),
                default => throw UnknownBillingDriverException::for((string) $driver),
            };
        });
    }

    public function boot(): void
    {
        $this->configureDefaults();
    }

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
