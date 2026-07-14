<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'prediction_model_result_id',
    'actual_usage_kwh',
    'signed_error_kwh',
    'absolute_error_kwh',
    'squared_error_kwh',
    'absolute_percentage_error',
    'evaluated_at',
])]
class PredictionEvaluation extends Model
{
    protected function casts(): array
    {
        return [
            'evaluated_at' => 'datetime',
            'actual_usage_kwh' => 'decimal:4',
            'signed_error_kwh' => 'decimal:4',
            'absolute_error_kwh' => 'decimal:4',
            'squared_error_kwh' => 'decimal:4',
            'absolute_percentage_error' => 'decimal:6',
        ];
    }

    /** @return BelongsTo<PredictionModelResult, $this> */
    public function modelResult(): BelongsTo
    {
        return $this->belongsTo(PredictionModelResult::class, 'prediction_model_result_id');
    }
}
