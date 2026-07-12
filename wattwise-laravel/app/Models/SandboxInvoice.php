<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * A simulated invoice. Never sent to a customer and never backed by a real
 * payment network. Always marked `simulated = true`.
 *
 * @property int $id
 * @property int $user_id
 * @property int $plan_id
 * @property string $invoice_number
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
}
