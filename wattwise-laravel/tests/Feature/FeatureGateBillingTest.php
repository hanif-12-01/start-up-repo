<?php

namespace Tests\Feature;

use App\Models\Subscription;
use App\Models\User;
use App\Services\FeatureGateService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FeatureGateBillingTest extends TestCase
{
    use RefreshDatabase;

    public function test_canonical_billing_plans_resolve_through_the_feature_gate(): void
    {
        $user = User::factory()->create();
        $subscription = Subscription::create([
            'user_id' => $user->id,
            'plan' => 'PRO',
            'status' => 'ACTIVE',
        ]);

        $featureGate = app(FeatureGateService::class);
        $this->assertSame('PRO', $featureGate->getEffectivePlan($user)['id']);
        $this->assertTrue($featureGate->can($user, 'reports.pdf'));

        $subscription->update(['plan' => 'BUSINESS']);
        $user->unsetRelation('subscription');
        $this->assertSame('BUSINESS', $featureGate->getEffectivePlan($user)['id']);
    }
}
