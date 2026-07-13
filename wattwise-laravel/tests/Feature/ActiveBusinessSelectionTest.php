<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ActiveBusinessSelectionTest extends TestCase
{
    use RefreshDatabase;

    /**
     * 1. Guest shared context is empty/null.
     */
    public function test_guest_shared_context_is_empty_or_null()
    {
        $response = $this->get(route('home'));
        $response->assertOk();

        // Guest doesn't have businessContext shared prop in Inertia page data
        $inertiaData = $response->original->getData();
        $this->assertArrayHasKey('businessContext', $inertiaData['page']['props']);
        $context = $inertiaData['page']['props']['businessContext'];

        $this->assertEmpty($context['activeBusinesses']);
        $this->assertNull($context['activeBusiness']);
    }

    /**
     * 2. Authenticated user with no business receives empty/null context.
     */
    public function test_authenticated_user_with_no_business_receives_empty_or_null_context()
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('getting-started.plan'));
        $response->assertOk();

        $inertiaData = $response->original->getData();
        $this->assertArrayHasKey('businessContext', $inertiaData['page']['props']);
        $context = $inertiaData['page']['props']['businessContext'];

        $this->assertEmpty($context['activeBusinesses']);
        $this->assertNull($context['activeBusiness']);
    }

    /**
     * 3. Global context contains owned ACTIVE businesses only.
     * 4. Archived businesses are excluded.
     * 5. Another user's businesses are excluded.
     */
    public function test_global_context_contains_owned_active_businesses_only()
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        // Active owned business
        $activeOwned = Business::create([
            'user_id' => $user->id,
            'name' => 'Owned Active',
            'business_type' => 'KOS_PROPERTY',
            'status' => Business::STATUS_ACTIVE,
        ]);

        // Archived owned business
        $archivedOwned = Business::create([
            'user_id' => $user->id,
            'name' => 'Owned Archived',
            'business_type' => 'LAUNDRY',
            'status' => Business::STATUS_ARCHIVED,
        ]);

        // Active foreign business
        $activeForeign = Business::create([
            'user_id' => $otherUser->id,
            'name' => 'Foreign Active',
            'business_type' => 'FNB',
            'status' => Business::STATUS_ACTIVE,
        ]);

        $this->actingAs($user);

        $response = $this->get(route('dashboard'));
        $response->assertOk();

        $inertiaData = $response->original->getData();
        $context = $inertiaData['page']['props']['businessContext'];

        // Only 1 active business should be returned
        $this->assertCount(1, $context['activeBusinesses']);
        $this->assertEquals($activeOwned->id, $context['activeBusinesses'][0]['id']);
        $this->assertEquals($activeOwned->name, $context['activeBusinesses'][0]['name']);

        $this->assertEquals($activeOwned->id, $context['activeBusiness']['id']);
    }

    /**
     * 6. Missing session selection falls back deterministically.
     * 7. Fallback repairs the session.
     */
    public function test_missing_session_selection_falls_back_deterministically_and_repairs_session()
    {
        $user = User::factory()->create();

        $businessB = Business::create([
            'user_id' => $user->id,
            'name' => 'Business B',
            'business_type' => 'KOS_PROPERTY',
            'status' => Business::STATUS_ACTIVE,
        ]);

        $businessA = Business::create([
            'user_id' => $user->id,
            'name' => 'Business A',
            'business_type' => 'FNB',
            'status' => Business::STATUS_ACTIVE,
        ]);

        $this->actingAs($user);

        // Access page without session key
        $this->assertNull(session('active_business_id'));

        $response = $this->get(route('dashboard'));
        $response->assertOk();

        // The fallback is deterministic (sorted by name, so Business A comes first)
        $this->assertEquals($businessA->id, session('active_business_id'));
    }

    /**
     * 8. Valid selection endpoint stores active_business_id.
     * 9. Selection persists across subsequent page requests.
     */
    public function test_valid_selection_endpoint_persists_active_business_id()
    {
        $user = User::factory()->create();
        $businessA = Business::create([
            'user_id' => $user->id,
            'name' => 'Business A',
            'business_type' => 'KOS_PROPERTY',
            'status' => Business::STATUS_ACTIVE,
        ]);
        $businessB = Business::create([
            'user_id' => $user->id,
            'name' => 'Business B',
            'business_type' => 'LAUNDRY',
            'status' => Business::STATUS_ACTIVE,
        ]);

        $this->actingAs($user);

        // Select Business B
        $response = $this->post(route('businesses.select'), [
            'business_id' => $businessB->id,
        ]);

        $response->assertRedirect();
        $this->assertEquals($businessB->id, session('active_business_id'));

        // Visit dashboard and make sure Business B is returned
        $responseDashboard = $this->get(route('dashboard'));
        $responseDashboard->assertOk();
        $context = $responseDashboard->original->getData()['page']['props']['businessContext'];
        $this->assertEquals($businessB->id, $context['activeBusiness']['id']);
    }

    /**
     * 10. Selected business is consistent on dashboard.
     * 11. Selected business is consistent on electricity page.
     * 12. Selected business is consistent on revenue page.
     * 13. Selected business is consistent on appliances page.
     * 14. Selected business is consistent on predictions/recommendations/reports.
     */
    public function test_selected_business_is_consistent_across_operational_pages()
    {
        $user = User::factory()->create();
        $businessA = Business::create([
            'user_id' => $user->id,
            'name' => 'Business A',
            'business_type' => 'KOS_PROPERTY',
            'status' => Business::STATUS_ACTIVE,
        ]);
        $businessB = Business::create([
            'user_id' => $user->id,
            'name' => 'Business B',
            'business_type' => 'LAUNDRY',
            'status' => Business::STATUS_ACTIVE,
        ]);

        $this->actingAs($user);
        session(['active_business_id' => $businessB->id]);

        $pages = [
            'dashboard',
            'electricity.index',
            'revenue.index',
            'appliances.index',
            'predictions.index',
            'anomalies.index',
            'recommendations.index',
            'reports.index',
        ];

        foreach ($pages as $routeName) {
            $response = $this->get(route($routeName));
            $response->assertOk();

            $props = $response->original->getData()['page']['props'];
            $this->assertEquals($businessB->id, $props['activeBusinessId'] ?? ($props['report']['business_id'] ?? null) ?? ($props['activeBusiness']['id'] ?? null));
        }
    }

    /**
     * 15. Foreign business selection is rejected with business_selection.
     */
    public function test_foreign_business_selection_is_rejected()
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $foreignBusiness = Business::create([
            'user_id' => $otherUser->id,
            'name' => 'Foreign',
            'business_type' => 'FNB',
            'status' => Business::STATUS_ACTIVE,
        ]);

        $this->actingAs($user);

        $response = $this->post(route('businesses.select'), [
            'business_id' => $foreignBusiness->id,
        ]);

        $response->assertSessionHasErrors('business_selection');
    }

    /**
     * 16. Archived business selection is rejected with business_selection.
     */
    public function test_archived_business_selection_is_rejected()
    {
        $user = User::factory()->create();

        $archivedBusiness = Business::create([
            'user_id' => $user->id,
            'name' => 'Archived',
            'business_type' => 'FNB',
            'status' => Business::STATUS_ARCHIVED,
        ]);

        $this->actingAs($user);

        $response = $this->post(route('businesses.select'), [
            'business_id' => $archivedBusiness->id,
        ]);

        $response->assertSessionHasErrors('business_selection');
    }

    /**
     * 17. Invalid selection does not overwrite a currently valid session.
     */
    public function test_invalid_selection_does_not_overwrite_valid_session()
    {
        $user = User::factory()->create();
        $businessA = Business::create([
            'user_id' => $user->id,
            'name' => 'Business A',
            'business_type' => 'KOS_PROPERTY',
            'status' => Business::STATUS_ACTIVE,
        ]);

        $this->actingAs($user);
        session(['active_business_id' => $businessA->id]);

        // Attempt selecting non-existent ID
        $response = $this->post(route('businesses.select'), [
            'business_id' => 9999,
        ]);

        $response->assertSessionHasErrors('business_selection');
        $this->assertEquals($businessA->id, session('active_business_id'));
    }

    /**
     * 18. Stale session selection falls back safely.
     */
    public function test_stale_session_selection_falls_back_safely()
    {
        $user = User::factory()->create();
        $businessA = Business::create([
            'user_id' => $user->id,
            'name' => 'Business A',
            'business_type' => 'KOS_PROPERTY',
            'status' => Business::STATUS_ACTIVE,
        ]);

        $this->actingAs($user);
        // Put non-existent id into session
        session(['active_business_id' => 9999]);

        $response = $this->get(route('dashboard'));
        $response->assertOk();

        // Falls back to Business A and repairs session
        $this->assertEquals($businessA->id, session('active_business_id'));
    }

    /**
     * 19. A valid legacy business_id query updates the session.
     */
    public function test_valid_legacy_query_updates_session()
    {
        $user = User::factory()->create();
        $businessA = Business::create([
            'user_id' => $user->id,
            'name' => 'Business A',
            'business_type' => 'KOS_PROPERTY',
            'status' => Business::STATUS_ACTIVE,
        ]);
        $businessB = Business::create([
            'user_id' => $user->id,
            'name' => 'Business B',
            'business_type' => 'LAUNDRY',
            'status' => Business::STATUS_ACTIVE,
        ]);

        $this->actingAs($user);
        session(['active_business_id' => $businessA->id]);

        // Visit with legacy query parameter pointing to Business B
        $response = $this->get(route('dashboard', ['business_id' => $businessB->id]));
        $response->assertOk();

        $this->assertEquals($businessB->id, session('active_business_id'));
    }

    /**
     * 20. An invalid query cannot select a foreign or archived business.
     */
    public function test_invalid_query_cannot_select_foreign_or_archived_business()
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $businessA = Business::create([
            'user_id' => $user->id,
            'name' => 'Business A',
            'business_type' => 'KOS_PROPERTY',
            'status' => Business::STATUS_ACTIVE,
        ]);

        $foreignBusiness = Business::create([
            'user_id' => $otherUser->id,
            'name' => 'Foreign',
            'business_type' => 'LAUNDRY',
            'status' => Business::STATUS_ACTIVE,
        ]);

        $archivedBusiness = Business::create([
            'user_id' => $user->id,
            'name' => 'Archived',
            'business_type' => 'FNB',
            'status' => Business::STATUS_ARCHIVED,
        ]);

        $this->actingAs($user);
        session(['active_business_id' => $businessA->id]);

        // 1. Query with foreign business id
        $response = $this->get(route('dashboard', ['business_id' => $foreignBusiness->id]));
        $response->assertOk();
        // Session selection is unchanged
        $this->assertEquals($businessA->id, session('active_business_id'));

        // 2. Query with archived business id
        $response2 = $this->get(route('dashboard', ['business_id' => $archivedBusiness->id]));
        $response2->assertOk();
        // Session selection is unchanged
        $this->assertEquals($businessA->id, session('active_business_id'));
    }

    /**
     * 21. Archiving the selected business repairs the context.
     */
    public function test_archiving_selected_business_repairs_context()
    {
        $user = User::factory()->create();
        $businessA = Business::create([
            'user_id' => $user->id,
            'name' => 'Business A',
            'business_type' => 'KOS_PROPERTY',
            'status' => Business::STATUS_ACTIVE,
        ]);
        $businessB = Business::create([
            'user_id' => $user->id,
            'name' => 'Business B',
            'business_type' => 'LAUNDRY',
            'status' => Business::STATUS_ACTIVE,
        ]);

        $this->actingAs($user);
        session(['active_business_id' => $businessB->id]);

        // Archive Business B
        $response = $this->post(route('businesses.archive', $businessB));
        $response->assertRedirect();

        // Visit a page to trigger resolver
        $this->get(route('dashboard'));

        // The session is repaired to Business A
        $this->assertEquals($businessA->id, session('active_business_id'));
    }

    /**
     * 22. Restoring a business does not replace an existing valid selection.
     */
    public function test_restoring_business_does_not_replace_valid_selection()
    {
        $user = User::factory()->create();
        // User needs PRO plan to have multiple active businesses
        Subscription::create([
            'user_id' => $user->id,
            'plan' => 'PRO',
            'status' => 'ACTIVE',
        ]);

        $businessA = Business::create([
            'user_id' => $user->id,
            'name' => 'Business A',
            'business_type' => 'KOS_PROPERTY',
            'status' => Business::STATUS_ACTIVE,
        ]);
        $businessB = Business::create([
            'user_id' => $user->id,
            'name' => 'Business B',
            'business_type' => 'LAUNDRY',
            'status' => Business::STATUS_ARCHIVED,
        ]);

        $this->actingAs($user);
        session(['active_business_id' => $businessA->id]);

        // Restore Business B
        $response = $this->post(route('businesses.restore', $businessB));
        $response->assertRedirect();

        // Active selection is still Business A
        $this->assertEquals($businessA->id, session('active_business_id'));
    }

    /**
     * 23. Creating a business does not replace a valid selection.
     */
    public function test_creating_business_does_not_replace_valid_selection()
    {
        $user = User::factory()->create();
        Subscription::create([
            'user_id' => $user->id,
            'plan' => 'PRO',
            'status' => 'ACTIVE',
        ]);

        $businessA = Business::create([
            'user_id' => $user->id,
            'name' => 'Business A',
            'business_type' => 'KOS_PROPERTY',
            'status' => Business::STATUS_ACTIVE,
        ]);

        $this->actingAs($user);
        session(['active_business_id' => $businessA->id]);

        // Create a new business
        $response = $this->post(route('businesses.store'), [
            'name' => 'New Business',
            'business_type' => 'LAUNDRY',
            'room_count' => 5,
            'occupied_room_count' => 3,
            'employee_count' => 1,
            'operating_days_per_month' => 30,
            'customer_type' => 'R1',
            'power_va' => 1300,
            'tariff_per_kwh' => 1444,
            'payment_method' => 'PREPAID',
            'meter_type' => 'DIGITAL',
        ]);

        $response->assertRedirect();
        // Session selection is still Business A, not the new one
        $this->assertEquals($businessA->id, session('active_business_id'));
    }
}
