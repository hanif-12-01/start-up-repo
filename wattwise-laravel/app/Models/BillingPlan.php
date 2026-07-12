<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * A purchasable sandbox billing plan. Prices are whole-rupiah (IDR has no
 * minor unit). These plans are simulation-only: "buying" one never contacts a
 * real payment provider.
 *
 * @property int $id
 * @property string $code
 * @property string $name
 * @property int $price_amount
 * @property string $currency
 * @property string $interval
 * @property array<string, mixed>|null $features
 * @property bool $active
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'code',
    'name',
    'price_amount',
    'currency',
    'interval',
    'features',
    'active',
])]
class BillingPlan extends Model
{
    public const CODE_FREE = 'free';

    public const CODE_STARTER = 'starter';

    public const CODE_PRO = 'pro';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'price_amount' => 'integer',
            'features' => 'array',
            'active' => 'boolean',
        ];
    }

    /**
     * Whether this plan is the free tier (no simulated payment required).
     */
    public function isFree(): bool
    {
        return $this->price_amount === 0 || $this->code === self::CODE_FREE;
    }

    /**
     * @return HasMany<SandboxInvoice, $this>
     */
    public function invoices(): HasMany
    {
        return $this->hasMany(SandboxInvoice::class, 'plan_id');
    }
}
