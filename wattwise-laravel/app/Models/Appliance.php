<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'business_id',
    'name',
    'category',
    'watt',
    'quantity',
    'hours_per_day',
    'days_per_month',
    'source',
    'confidence',
    'notes'
])]
class Appliance extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'watt' => 'decimal:2',
            'quantity' => 'integer',
            'hours_per_day' => 'decimal:2',
            'days_per_month' => 'integer',
        ];
    }

    /**
     * Get the business that owns this appliance.
     */
    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }
}
