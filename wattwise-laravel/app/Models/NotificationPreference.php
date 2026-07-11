<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property string|null $whatsapp_phone Decrypted normalized E.164 number (encrypted at rest).
 * @property bool $whatsapp_enabled
 * @property Carbon|null $whatsapp_opted_in_at
 * @property int|null $monthly_reminder_day
 * @property string|null $timezone
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read User $user
 */
#[Fillable([
    'user_id',
    'whatsapp_phone',
    'whatsapp_enabled',
    'whatsapp_opted_in_at',
    'monthly_reminder_day',
    'timezone',
])]
// The raw WhatsApp number must never be serialized into shared Inertia props.
#[Hidden(['whatsapp_phone'])]
class NotificationPreference extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'whatsapp_phone' => 'encrypted',
            'whatsapp_enabled' => 'boolean',
            'whatsapp_opted_in_at' => 'datetime',
            'monthly_reminder_day' => 'integer',
        ];
    }

    /**
     * The user that owns this preference.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
