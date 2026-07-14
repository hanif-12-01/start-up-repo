<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'business_id',
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
