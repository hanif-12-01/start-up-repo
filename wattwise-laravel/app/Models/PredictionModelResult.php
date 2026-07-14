<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable([
    'prediction_run_id',
    'model_key',
    'model_version',
    'execution_mode',
    'status',
    'predicted_usage_kwh',
    'predicted_bill_idr',
    'feature_snapshot',
    'artifact_sha256',
    'duration_ms',
    'skip_reason',
    'failure_code',
    'generated_at',
])]
class PredictionModelResult extends Model
{
    protected function casts(): array
    {
        return [
            'feature_snapshot' => 'array',
            'generated_at' => 'datetime',
            'predicted_usage_kwh' => 'decimal:4',
            'predicted_bill_idr' => 'decimal:2',
            'duration_ms' => 'decimal:3',
        ];
    }

    /** @return BelongsTo<PredictionRun, $this> */
    public function predictionRun(): BelongsTo
    {
        return $this->belongsTo(PredictionRun::class);
    }

    /** @return HasOne<PredictionEvaluation, $this> */
    public function evaluation(): HasOne
    {
        return $this->hasOne(PredictionEvaluation::class, 'prediction_model_result_id');
    }
}
