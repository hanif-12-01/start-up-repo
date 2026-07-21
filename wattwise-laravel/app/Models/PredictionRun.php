<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'business_id',
    'request_id',
    'source_entry_id',
    'reporting_phase',
    'selected_model',
    'selected_model_version',
    'prediction_mode',
    'phase_status',
    'prediction_output_kwh',
    'deterministic_fallback_kwh',
    'eligibility_status',
    'fallback_reason',
    'inference_latency_ms',
    'artifact_identifier',
    'artifact_sha256',
    'error_category',
    'inference_warnings',
    'target_period',
    'input_fingerprint',
    'trigger_source',
    'history_months',
    'history_bucket',
    'business_type_snapshot',
    'tariff_snapshot',
    'generated_at',
])]
class PredictionRun extends Model
{
    protected function casts(): array
    {
        return [
            'generated_at' => 'datetime',
            'tariff_snapshot' => 'decimal:2',
            'prediction_output_kwh' => 'decimal:4',
            'deterministic_fallback_kwh' => 'decimal:4',
            'inference_latency_ms' => 'decimal:3',
            'inference_warnings' => 'array',
        ];
    }

    /** @return BelongsTo<Business, $this> */
    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    /** @return HasMany<PredictionModelResult, $this> */
    public function modelResults(): HasMany
    {
        return $this->hasMany(PredictionModelResult::class);
    }
}
