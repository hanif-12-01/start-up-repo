<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * The user's current sandbox entitlement. A paid plan is only ever granted
 * after a `simulated_paid` payment; a failed or pending payment never upgrades
 * this record.
 *
 * @property int $id
 * @property int $user_id
 * @property int|null $plan_id
 * @property string $status
 * @property string $source
 * @property Carbon|null $starts_at
 * @property Carbon|null $ends_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read User $user
 * @property-read BillingPlan|null $plan
 */
#[Fillable([
    'user_id',
    'plan_id',
    'status',
    'source',
    'starts_at',
    'ends_at',
])]
class UserEntitlement extends Model
{
    public const STATUS_FREE = 'free';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_EXPIRED = 'expired';

    public const STATUS_CANCELLED = 'cancelled';

    public const SOURCE_SANDBOX = 'sandbox';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
        ];
    }

    /**
     * Whether a paid plan is currently active (and not expired).
     */
    public function isActivePaid(): bool
    {
        if ($this->status !== self::STATUS_ACTIVE) {
            return false;
        }

        if ($this->ends_at !== null && $this->ends_at->isPast()) {
            return false;
        }

        return $this->plan_id !== null;
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<BillingPlan, $this>
     */
    public function plan(): BelongsTo
    {
        return $this->belongsTo(BillingPlan::class, 'plan_id');
    }
}
