<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property int $invoice_id
 * @property string $provider
 * @property string|null $provider_reference
 * @property int $amount
 * @property string $currency
 * @property string $status
 * @property bool $simulated
 * @property array<string, mixed>|null $metadata
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read User $user
 * @property-read SandboxInvoice $invoice
 */
#[Fillable([
    'user_id',
    'invoice_id',
    'provider',
    'provider_reference',
    'amount',
    'currency',
    'status',
    'simulated',
    'metadata',
])]
class SandboxPayment extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_SIMULATED_PAID = 'simulated_paid';

    public const STATUS_FAILED = 'failed';

    public const STATUS_CANCELLED = 'cancelled';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount' => 'integer',
            'simulated' => 'boolean',
            'metadata' => 'array',
        ];
    }

    public function isTerminal(): bool
    {
        return in_array($this->status, [self::STATUS_SIMULATED_PAID, self::STATUS_FAILED, self::STATUS_CANCELLED], true);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<SandboxInvoice, $this>
     */
    public function invoice(): BelongsTo
    {
        return $this->belongsTo(SandboxInvoice::class, 'invoice_id');
    }
}
