<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
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
    'onboarding_completed_at',
])]
class Business extends Model
{
    /**
     * Business lifecycle statuses. Businesses are never hard-deleted —
     * they are archived instead (archive/restore lands in Step 11).
     */
    public const STATUS_ACTIVE = 'ACTIVE';

    public const STATUS_ARCHIVED = 'ARCHIVED';

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
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the business profile details.
     *
     * @return HasOne<BusinessProfile, $this>
     */
    public function businessProfile(): HasOne
    {
        return $this->hasOne(BusinessProfile::class);
    }

    /**
     * Get the electricity profile details.
     *
     * @return HasOne<ElectricityProfile, $this>
     */
    public function electricityProfile(): HasOne
    {
        return $this->hasOne(ElectricityProfile::class);
    }

    /**
     * Get the electricity entries for the business.
     *
     * @return HasMany<ElectricityEntry, $this>
     */
    public function electricityEntries(): HasMany
    {
        return $this->hasMany(ElectricityEntry::class);
    }

    /**
     * Get the revenue entries for the business.
     *
     * @return HasMany<RevenueEntry, $this>
     */
    public function revenueEntries(): HasMany
    {
        return $this->hasMany(RevenueEntry::class);
    }

    /**
     * Get the appliances for the business.
     *
     * @return HasMany<Appliance, $this>
     */
    public function appliances(): HasMany
    {
        return $this->hasMany(Appliance::class);
    }

    /**
     * Scope a query to only include active businesses.
     *
     * @param  Builder<Business>  $query
     * @return Builder<Business>
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }

    /**
     * Scope a query to only include archived businesses.
     *
     * @param  Builder<Business>  $query
     * @return Builder<Business>
     */
    public function scopeArchived(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_ARCHIVED);
    }
}
