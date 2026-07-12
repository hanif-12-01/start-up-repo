<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property int $plan_id
 * @property string $invoice_number
 * @property string $idempotency_key
 * @property int $amount
 * @property string $currency
 * @property string $status
 * @property bool $simulated
 * @property Carbon|null $issued_at
 * @property Carbon|null $paid_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read User $user
 * @property-read BillingPlan $plan
 */
#[Fillable([
    'user_id',
    'plan_id',
    'invoice_number',
    'idempotency_key',
    'amount',
    'currency',
    'status',
    'simulated',
    'issued_at',
    'paid_at',
])]
class SandboxInvoice extends Model
{
    public const STATUS_DRAFT = 'draft';

    public const STATUS_OPEN = 'open';

    public const STATUS_PAID = 'paid';

    public const STATUS_VOID = 'void';

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
            'issued_at' => 'datetime',
            'paid_at' => 'datetime',
        ];
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

    /**
     * @return HasMany<SandboxPayment, $this>
     */
    public function payments(): HasMany
    {
        return $this->hasMany(SandboxPayment::class, 'invoice_id');
    }

    /**
     * @return HasOne<SandboxPayment, $this>
     */
    public function payment(): HasOne
    {
        return $this->hasOne(SandboxPayment::class, 'invoice_id');
    }
}
