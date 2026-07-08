<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'business_id',
    'customer_type',
    'power_va',
    'tariff_per_kwh',
    'payment_method',
    'meter_type',
    'notes'
])]
class ElectricityProfile extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'tariff_per_kwh' => 'decimal:2',
        ];
    }

    /**
     * Get the business that owns this electricity profile.
     */
    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }
}
