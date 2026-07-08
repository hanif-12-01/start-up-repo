<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'business_id',
    'period_month',
    'revenue_amount_idr',
    'revenue_input_mode',
    'notes'
])]
class RevenueEntry extends Model
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
            'revenue_amount_idr' => 'decimal:2',
        ];
    }

    /**
     * Get the business that owns this revenue entry.
     */
    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }
}
