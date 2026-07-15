<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\ElectricityEntry;
use App\Models\RevenueEntry;
use App\Models\Subscription;
use App\Models\User;
use App\Services\Predictions\PredictionService;
use Carbon\Carbon;
use Database\Seeders\PredictionPhaseDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use RuntimeException;
use Tests\TestCase;

class PredictionPhaseDemoSeederTest extends TestCase
{
    use RefreshDatabase;

    private const PASSWORD = 'DemoPhase#2026';

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-07-15 12:00:00');
        config()->set('demo.phase_accounts.enabled', true);
        config()->set('demo.phase_accounts.password', self::PASSWORD);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_seeder_creates_four_login_ready_accounts_with_expected_history_boundaries(): void
    {
        $this->runSeeder();

        $this->assertCount(4, PredictionPhaseDemoSeeder::ACCOUNT_SPECS);

        foreach (PredictionPhaseDemoSeeder::ACCOUNT_SPECS as $spec) {
            $user = User::where('email', $spec['email'])->first();

            $this->assertNotNull($user);
            $this->assertSame($spec['user_name'], $user->name);
            $this->assertNotNull($user->email_verified_at);
            $this->assertNotNull($user->initial_plan_selected_at);
            $this->assertTrue(Hash::check(self::PASSWORD, $user->password));

            $business = Business::where('user_id', $user->id)->sole();
            $this->assertSame($spec['business_name'], $business->name);

            $this->assertSame(
                $spec['history_months'],
                ElectricityEntry::where('business_id', $business->id)->count(),
            );
            $this->assertSame(
                $spec['history_months'],
                RevenueEntry::where('business_id', $business->id)->count(),
            );

            $latestMonth = ElectricityEntry::where('business_id', $business->id)
                ->max('period_month');

            $this->assertSame('2026-06', Carbon::parse($latestMonth)->format('Y-m'));

            $subscription = Subscription::where('user_id', $user->id)->sole();
            $this->assertSame('PRO_TRIAL', $subscription->plan);
            $this->assertSame('ACTIVE', $subscription->status);
            $this->assertSame($spec['phase'], $subscription->metadata['phase']);
            $this->assertSame($spec['history_months'], $subscription->metadata['history_months']);
        }
    }

    public function test_shorter_accounts_receive_the_tail_of_the_same_reference_series(): void
    {
        $this->runSeeder();

        $histories = [];

        foreach (PredictionPhaseDemoSeeder::ACCOUNT_SPECS as $spec) {
            $business = $this->businessForEmail($spec['email']);
            $histories[$spec['history_months']] = ElectricityEntry::where('business_id', $business->id)
                ->orderBy('period_month')
                ->pluck('usage_kwh')
                ->map(static fn ($value): float => (float) $value)
                ->all();
        }

        $this->assertSame(array_slice($histories[18], -2), $histories[2]);
        $this->assertSame(array_slice($histories[18], -5), $histories[5]);
        $this->assertSame(array_slice($histories[18], -12), $histories[12]);
    }

    public function test_seeded_accounts_exercise_current_prediction_history_paths(): void
    {
        $this->runSeeder();

        $service = app(PredictionService::class);

        foreach (PredictionPhaseDemoSeeder::ACCOUNT_SPECS as $spec) {
            $result = $service->predictForBusiness($this->businessForEmail($spec['email']));

            $this->assertTrue($result['has_prediction']);
            $this->assertSame(
                $spec['history_months'],
                $result['data_requirements']['history_months'],
            );

            if ($spec['history_months'] === 2) {
                $this->assertSame(PredictionService::METHOD_PATTERN, $result['method_label']);
                $this->assertTrue($result['data_requirements']['needs_more_data']);
            } else {
                $this->assertSame(PredictionService::METHOD_HYBRID, $result['method_label']);
                $this->assertFalse($result['data_requirements']['needs_more_data']);
            }
        }
    }

    public function test_seeder_is_idempotent_and_scoped_to_its_own_accounts(): void
    {
        $existingUser = User::create([
            'name' => 'Existing User',
            'email' => 'existing@example.com',
            'password' => 'Existing#Pass2026',
        ]);

        $existingBusiness = Business::create([
            'user_id' => $existingUser->id,
            'name' => 'Existing Business',
            'business_type' => 'FNB',
            'status' => 'ACTIVE',
        ]);

        $this->runSeeder();
        $this->runSeeder();

        foreach (PredictionPhaseDemoSeeder::ACCOUNT_SPECS as $spec) {
            $this->assertSame(1, User::where('email', $spec['email'])->count());

            $business = $this->businessForEmail($spec['email']);
            $this->assertSame(
                $spec['history_months'],
                ElectricityEntry::where('business_id', $business->id)->count(),
            );
            $this->assertSame(
                $spec['history_months'],
                RevenueEntry::where('business_id', $business->id)->count(),
            );
        }

        $this->assertTrue(User::whereKey($existingUser->id)->exists());
        $this->assertTrue(Business::whereKey($existingBusiness->id)->exists());
        $this->assertSame(
            0,
            ElectricityEntry::where('business_id', $existingBusiness->id)->count(),
        );
    }

    public function test_seeder_refuses_to_run_when_phase_accounts_are_disabled(): void
    {
        config()->set('demo.phase_accounts.enabled', false);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Prediction phase demo accounts are disabled.');

        $this->runSeeder();
    }

    public function test_seeder_refuses_a_weak_or_missing_password(): void
    {
        config()->set('demo.phase_accounts.password', 'password');

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('DEMO_PHASE_ACCOUNTS_PASSWORD must be at least 12 characters');

        $this->runSeeder();
    }

    private function runSeeder(): void
    {
        $this->seed(PredictionPhaseDemoSeeder::class);
    }

    private function businessForEmail(string $email): Business
    {
        $user = User::where('email', $email)->sole();

        return Business::where('user_id', $user->id)->sole();
    }
}
