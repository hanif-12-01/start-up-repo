<?php

declare(strict_types=1);

namespace App\Providers;

use App\Services\Predictions\MachineLearning\AdaptiveModelRouter;
use App\Services\Predictions\MachineLearning\DeterministicPredictionAdapter;
use App\Services\Predictions\MachineLearning\GradientBoostingPredictor;
use App\Services\Predictions\MachineLearning\ModelEligibilityResolver;
use App\Services\Predictions\MachineLearning\ModelPerformanceEvaluator;
use App\Services\Predictions\MachineLearning\ModelRegistry;
use App\Services\Predictions\MachineLearning\PredictionEvaluationService;
use App\Services\Predictions\MachineLearning\PredictionShadowOrchestrator;
use App\Services\Predictions\MachineLearning\RidgeRegressionPredictor;
use App\Services\Predictions\PredictionService;
use Illuminate\Support\ServiceProvider;

class PredictionServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(ModelRegistry::class, function ($app) {
            $registry = new ModelRegistry;

            $registry->register(new DeterministicPredictionAdapter(
                $app->make(PredictionService::class)
            ));
            $registry->register(new RidgeRegressionPredictor);
            $registry->register(new GradientBoostingPredictor);

            return $registry;
        });

        $this->app->singleton(ModelEligibilityResolver::class);
        $this->app->singleton(ModelPerformanceEvaluator::class);
        $this->app->singleton(PredictionEvaluationService::class);

        $this->app->singleton(PredictionShadowOrchestrator::class, function ($app) {
            return new PredictionShadowOrchestrator(
                $app->make(ModelRegistry::class),
                $app->make(ModelEligibilityResolver::class)
            );
        });

        $this->app->singleton(AdaptiveModelRouter::class, function ($app) {
            return new AdaptiveModelRouter(
                $app->make(ModelPerformanceEvaluator::class),
                $app->make(ModelRegistry::class)
            );
        });
    }
}
