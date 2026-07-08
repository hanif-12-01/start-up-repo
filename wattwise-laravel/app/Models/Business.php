<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable([
    'user_id',
    'name',
    'business_type',
    'city',
    'province',
    'address',
    'status',
    'onboarding_completed_at'
])]
class Business extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'onboarding_completed_at' => 'datetime',
        ];
    }

    /**
     * Get the user that owns the business.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the business profile details.
     */
    public function businessProfile(): HasOne
    {
        return $this->hasOne(BusinessProfile::class);
    }

    /**
     * Get the electricity profile details.
     */
    public function electricityProfile(): HasOne
    {
        return $this->hasOne(ElectricityProfile::class);
    }

    /**
     * Get the electricity entries for the business.
     */
    public function electricityEntries(): HasMany
    {
        return $this->hasMany(ElectricityEntry::class);
    }

    /**
     * Get the revenue entries for the business.
     */
    public function revenueEntries(): HasMany
    {
        return $this->hasMany(RevenueEntry::class);
    }
}
