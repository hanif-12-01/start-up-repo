<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'business_id',
    'room_count',
    'occupied_room_count',
    'employee_count',
    'operating_days_per_month',
    'notes'
])]
class BusinessProfile extends Model
{
    /**
     * Get the business that owns this profile.
     */
    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }
}
