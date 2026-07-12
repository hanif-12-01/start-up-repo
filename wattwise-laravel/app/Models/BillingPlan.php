<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use RuntimeException;

/**
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

    public const CODE_PRO = 'pro';

    public const CODE_BUSINESS = 'business';

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

    public function isFree(): bool
    {
        return $this->price_amount === 0 || $this->code === self::CODE_FREE;
    }

    /**
     * Map this billing plan code to the canonical FeatureGateService plan identifier.
     */
    public function featureGatePlan(): string
    {
        /** @var array<string, string> $map */
        $map = config('billing.plan_map', []);

        $gatePlan = $map[$this->code] ?? null;

        if (! is_string($gatePlan) || $gatePlan === '') {
            throw new RuntimeException('Billing plan ['.$this->code.'] has no FeatureGateService mapping.');
        }

        return $gatePlan;
    }

    /**
     * @return HasMany<SandboxInvoice, $this>
     */
    public function invoices(): HasMany
    {
        return $this->hasMany(SandboxInvoice::class, 'plan_id');
    }
}
