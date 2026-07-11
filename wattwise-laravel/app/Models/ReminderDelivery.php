<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Idempotency record for monthly reminders. Never stores the plaintext phone
 * or full message payload — only a fingerprint, masked destination, and status.
 *
 * @property int $id
 * @property int $user_id
 * @property int $notification_preference_id
 * @property string $type
 * @property string $period
 * @property string $destination_fingerprint
 * @property string|null $destination_masked
 * @property string $status
 * @property Carbon|null $attempted_at
 * @property Carbon|null $delivered_at
 * @property string|null $failure_code
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read User $user
 */
#[Fillable([
    'user_id',
    'notification_preference_id',
    'type',
    'period',
    'destination_fingerprint',
    'destination_masked',
    'status',
    'attempted_at',
    'delivered_at',
    'failure_code',
])]
class ReminderDelivery extends Model
{
    // A real provider delivery confirmed (future). Blocks duplicates.
    public const STATUS_SENT = 'sent';

    // A real send is queued/awaiting provider confirmation (future). Blocks duplicates.
    public const STATUS_PENDING = 'pending';

    // The log driver ran: recorded but NOT delivered to WhatsApp. Non-blocking.
    public const STATUS_LOGGED = 'logged';

    // A dry-run-style simulation was recorded (no send). Non-blocking.
    public const STATUS_SIMULATED = 'simulated';

    // An attempt failed. Non-blocking (retryable).
    public const STATUS_FAILED = 'failed';

    /**
     * Statuses that count as a delivered/in-flight duplicate and therefore
     * block re-processing the same user/type/period.
     */
    public const BLOCKING_STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_SENT,
    ];

    /**
     * Statuses that remain reusable: a future real provider may transition an
     * existing row through pending and then sent for the same user/type/period.
     */
    public const NON_BLOCKING_STATUSES = [
        self::STATUS_LOGGED,
        self::STATUS_SIMULATED,
        self::STATUS_FAILED,
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'attempted_at' => 'datetime',
            'delivered_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
