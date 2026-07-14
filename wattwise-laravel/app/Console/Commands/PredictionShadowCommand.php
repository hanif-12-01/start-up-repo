<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Business;
use App\Services\Predictions\MachineLearning\PredictionShadowOrchestrator;
use Carbon\Carbon;
use Illuminate\Console\Command;

class PredictionShadowCommand extends Command
{
    protected $signature = 'wattwise:prediction-shadow
        {--business= : Business ID to evaluate}
        {--period= : Target period (YYYY-MM)}
        {--dry-run : Preview without writing}
        {--limit=10 : Maximum businesses to process}
        {--confirm : Required to actually write results}';

    protected $description = 'Run shadow prediction evaluation for businesses';

    public function handle(PredictionShadowOrchestrator $orchestrator): int
    {
        $isDryRun = $this->option('dry-run') || ! $this->option('confirm');
        $limit = (int) $this->option('limit');

        if ($isDryRun) {
            $this->info('[DRY RUN] No results will be written.');
        }

        if (! config('prediction.shadow_enabled', false) && ! $isDryRun) {
            $this->warn('Shadow evaluation is disabled. Set PREDICTION_SHADOW_ENABLED=true to enable.');

            return self::SUCCESS;
        }

        $businessId = $this->option('business');
        $businesses = $businessId
            ? Business::where('id', $businessId)->active()->get()
            : Business::active()->limit($limit)->get();

        if ($businesses->isEmpty()) {
            $this->info('No active businesses found.');

            return self::SUCCESS;
        }

        $processed = 0;
        $skipped = 0;
        $errors = 0;

        foreach ($businesses as $business) {
            try {
                $entries = $business->electricityEntries()
                    ->orderBy('period_month', 'asc')
                    ->get();

                $history = [];
                foreach ($entries as $entry) {
                    if ($entry->usage_kwh === null) {
                        continue;
                    }
                    $history[] = [
                        'period_month' => Carbon::parse($entry->period_month)->format('Y-m'),
                        'usage_kwh' => (float) $entry->usage_kwh,
                    ];
                }

                if (empty($history)) {
                    $skipped++;

                    continue;
                }

                $tariff = $business->electricityProfile?->tariff_per_kwh
                    ? (float) $business->electricityProfile->tariff_per_kwh
                    : null;
                if ($tariff === null) {
                    $latestWithTariff = $entries->whereNotNull('tariff_per_kwh')->last();
                    $tariff = $latestWithTariff ? (float) $latestWithTariff->tariff_per_kwh : null;
                }

                $period = $this->option('period')
                    ?? Carbon::parse($entries->last()->period_month)->addMonth()->format('Y-m');

                $businessType = $business->business_type ?? 'OTHER';

                if ($isDryRun) {
                    $this->line("  Business #{$business->id}: {$businessType}, {$period}, history=".count($history).' months');
                    $processed++;

                    continue;
                }

                $run = $orchestrator->execute(
                    $business->id,
                    $period,
                    $history,
                    $businessType,
                    $tariff,
                    'artisan_command',
                );

                if ($run) {
                    $processed++;
                } else {
                    $skipped++;
                }
            } catch (\Throwable $e) {
                $errors++;
                $this->warn("  Business #{$business->id}: {$e->getMessage()}");
            }
        }

        $this->info("Processed: {$processed}, Skipped: {$skipped}, Errors: {$errors}");

        return self::SUCCESS;
    }
}
