<?php

namespace App\Providers;

use App\Contracts\BillingProvider;
use App\Contracts\WhatsAppGateway;
use App\Services\ActiveBusinessResolver;
use App\Services\Billing\BillingAvailability;
use App\Services\Billing\SandboxSimulatorProvider;
use App\Services\WhatsApp\LogWhatsAppGateway;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(ActiveBusinessResolver::class);

        $this->app->bind(WhatsAppGateway::class, function ($app) {
            $driver = config('whatsapp.driver');
            if ($driver !== 'log') {
                throw new \RuntimeException("WhatsApp driver [{$driver}] is not supported.");
            }

            return $app->make(LogWhatsAppGateway::class);
        });

        $this->app->bind(BillingProvider::class, function ($app) {
            $app->make(BillingAvailability::class)->assertEnabled();

            return $app->make(SandboxSimulatorProvider::class);
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
