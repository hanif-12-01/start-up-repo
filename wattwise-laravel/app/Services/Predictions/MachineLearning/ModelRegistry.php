<?php

declare(strict_types=1);

namespace App\Services\Predictions\MachineLearning;

final class ModelRegistry
{
    /** @var array<string, PredictionModelInterface> */
    private array $models = [];

    /** @param PredictionModelInterface[] $models */
    public function __construct(array $models = [])
    {
        foreach ($models as $model) {
            $this->register($model);
        }
    }

    public function register(PredictionModelInterface $model): void
    {
        $this->models[$model->key()] = $model;
    }

    /** @return PredictionModelInterface[] */
    public function all(): array
    {
        return array_values($this->models);
    }

    public function get(string $key): ?PredictionModelInterface
    {
        return $this->models[$key] ?? null;
    }

    private const CONFIG_KEY_MAP = [
        'deterministic' => 'deterministic',
        'ridge_umkm_v1_1' => 'ridge',
        'gradient_boosting_umkm_v1' => 'gradient_boosting',
    ];

    public function getStatus(string $key): string
    {
        $model = $this->get($key);

        if ($model === null) {
            return 'DISABLED';
        }

        // ponytail: baseline election is first-registered; add promotion table when multi-baseline needed
        $first = array_key_first($this->models);
        if ($key === $first) {
            return 'ACTIVE_BASELINE';
        }

        $configKey = self::CONFIG_KEY_MAP[$key] ?? $key;
        if (! config("prediction.{$configKey}_enabled", false)) {
            return 'DISABLED';
        }

        if (! $this->isHealthy($key)) {
            return 'BLOCKED_ARTIFACT_INCOMPLETE';
        }

        return 'SHADOW';
    }

    public function isHealthy(string $key): bool
    {
        return $this->get($key) !== null;
    }
}
