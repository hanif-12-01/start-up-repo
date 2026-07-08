<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'business_id',
    'period_month',
    'usage_kwh',
    'bill_amount_idr',
    'meter_start',
    'meter_end',
    'tariff_per_kwh',
    'payment_method',
    'notes'
])]
class ElectricityEntry extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'period_month' => 'date',
            'usage_kwh' => 'decimal:2',
            'bill_amount_idr' => 'decimal:2',
            'meter_start' => 'decimal:2',
            'meter_end' => 'decimal:2',
            'tariff_per_kwh' => 'decimal:2',
        ];
    }

    /**
     * Get the business that owns this electricity entry.
     */
    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }
}
