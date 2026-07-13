<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

/**
 * Step 2 — Dynamic Plan UI & Sidebar Restructure.
 *
 * Covers the dynamic plan badge (driven by the shared effectivePlan contract),
 * absence of any hardcoded demo plan state, and conditional onboarding visibility.
 */
class DynamicPlanUiTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return string[] Every .vue file under resources/js.
     */
    private function allVueFiles(): array
    {
        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator(resource_path('js'), \FilesystemIterator::SKIP_DOTS)
        );

        $files = [];
        foreach ($iterator as $file) {
            if ($file->isFile() && str_ends_with($file->getFilename(), '.vue')) {
                $files[] = $file->getPathname();
            }
        }

        return $files;
    }

    // ---------------------------------------------------------------------
    // Dynamic plan badge (shared effectivePlan prop)
    // ---------------------------------------------------------------------

    public function test_dashboard_shares_free_plan_for_user_without_subscription(): void
    {
        $user = User::factory()->create();
        Business::create(['user_id' => $user->id, 'name' => 'Test', 'business_type' => 'KOS_PROPERTY', 'status' => 'ACTIVE']);

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertInertia(fn ($page) => $page
                ->where('effectivePlan.id', 'FREE')
                ->where('effectivePlan.label', 'Gratis')
                ->where('effectivePlan.is_trial', false)
            );
    }

    public function test_dashboard_shares_pro_trial_plan_with_remaining_days(): void
    {
        $user = User::factory()->create();
        Business::create(['user_id' => $user->id, 'name' => 'Test', 'business_type' => 'KOS_PROPERTY', 'status' => 'ACTIVE']);
        Subscription::create([
            'user_id' => $user->id,
            'plan' => 'PRO_TRIAL',
            'status' => 'ACTIVE',
            'trial_ends_at' => Carbon::now()->addDays(12),
        ]);

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertInertia(fn ($page) => $page
                ->where('effectivePlan.id', 'PRO_TRIAL')
                ->where('effectivePlan.label', 'Pro Trial')
                ->where('effectivePlan.is_trial', true)
                ->where('effectivePlan.remaining_trial_days', 12)
            );
    }

    public function test_dashboard_shares_paid_plan_label_never_gratis(): void
    {
        $user = User::factory()->create();
        Business::create(['user_id' => $user->id, 'name' => 'Test', 'business_type' => 'KOS_PROPERTY', 'status' => 'ACTIVE']);
        Subscription::create([
            'user_id' => $user->id,
            'plan' => 'PRO',
            'status' => 'ACTIVE',
        ]);

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertInertia(fn ($page) => $page
                ->where('effectivePlan.id', 'PRO')
                ->where('effectivePlan.label', 'Pro')
                ->where('effectivePlan.is_trial', false)
            );
    }

    // ---------------------------------------------------------------------
    // No hardcoded Demo PRO_TRIAL anywhere in the UI
    // ---------------------------------------------------------------------

    public function test_no_hardcoded_demo_pro_trial_in_vue_files(): void
    {
        foreach ($this->allVueFiles() as $file) {
            $this->assertStringNotContainsString(
                'Demo PRO_TRIAL',
                file_get_contents($file),
                'Hardcoded "Demo PRO_TRIAL" found in ' . basename($file)
            );
        }
    }

    public function test_plan_badge_component_is_driven_by_effective_plan(): void
    {
        $badge = resource_path('js/components/PlanBadge.vue');
        $this->assertFileExists($badge);

        $badgeContent = file_get_contents($badge);
        $this->assertStringContainsString('effectivePlan', $badgeContent);
        $this->assertStringNotContainsString('Demo PRO_TRIAL', $badgeContent);

        // Dashboard renders the dynamic badge component, not a hardcoded label.
        $dashboard = file_get_contents(resource_path('js/pages/Dashboard.vue'));
        $this->assertStringContainsString('PlanBadge', $dashboard);
    }

    // ---------------------------------------------------------------------
    // Onboarding visibility behavior
    // ---------------------------------------------------------------------

    public function test_needs_onboarding_is_true_when_user_has_no_business(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('getting-started.plan'))
            ->assertInertia(fn ($page) => $page->where('needsOnboarding', true));
    }

    public function test_needs_onboarding_is_false_after_onboarding_complete(): void
    {
        $user = User::factory()->create();
        Business::create([
            'user_id' => $user->id,
            'name' => 'Kos A',
            'business_type' => 'KOS_PROPERTY',
            'status' => 'ACTIVE',
        ]);

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertInertia(fn ($page) => $page->where('needsOnboarding', false));
    }

    public function test_guest_gets_safe_shared_defaults(): void
    {
        $this->get('/')->assertInertia(fn ($page) => $page
            ->where('effectivePlan', null)
            ->where('needsOnboarding', false)
        );
    }
}
