<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\BusinessProfile;
use App\Models\ElectricityProfile;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

/**
 * Step 10 — Businesses backend: index, store, update, authorization,
 * validation, and active-business plan-limit enforcement.
 */
class BusinessControllerTest extends TestCase
{
    use RefreshDatabase;

    private function makeBusiness(User $user, string $name = 'Kos A', string $status = Business::STATUS_ACTIVE): Business
    {
        return Business::create([
            'user_id' => $user->id,
            'name' => $name,
            'business_type' => 'KOS_PROPERTY',
            'status' => $status,
        ]);
    }

    private function subscribe(User $user, string $plan): Subscription
    {
        $extra = $plan === 'PRO_TRIAL' ? ['trial_ends_at' => Carbon::now()->addDays(10)] : [];

        return Subscription::create(array_merge([
            'user_id' => $user->id,
            'plan' => $plan,
            'status' => 'ACTIVE',
        ], $extra));
    }

    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Kos Baru',
            'business_type' => 'KOS_PROPERTY',
            'city' => 'Purwokerto',
            'province' => 'Jawa Tengah',
            'address' => 'Jl. Contoh No. 1',
            'room_count' => 10,
            'occupied_room_count' => 8,
            'employee_count' => 2,
            'operating_days_per_month' => 30,
            'business_notes' => 'Catatan usaha',
            'customer_type' => 'Bisnis/Rumah Tangga',
            'power_va' => 2200,
            'tariff_per_kwh' => 1444.70,
            'payment_method' => 'Pascabayar',
            'meter_type' => 'Pascabayar',
            'electricity_notes' => 'Catatan listrik',
        ], $overrides);
    }

    // ---------------------------------------------------------------------
    // INDEX
    // ---------------------------------------------------------------------

    public function test_guest_is_redirected(): void
    {
        $this->get(route('businesses.index'))->assertRedirect('/login');
    }

    public function test_authenticated_user_can_open_businesses_page(): void
    {
        $user = User::factory()->create();
        $this->makeBusiness($user);

        $this->actingAs($user)
            ->get(route('businesses.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Businesses'));
    }

    public function test_index_returns_owned_active_and_archived_businesses(): void
    {
        $user = User::factory()->create();
        $this->makeBusiness($user, 'Aktif Satu', Business::STATUS_ACTIVE);
        $this->makeBusiness($user, 'Arsip Satu', Business::STATUS_ARCHIVED);

        $this->actingAs($user)
            ->get(route('businesses.index'))
            ->assertInertia(fn ($page) => $page
                ->has('activeBusinesses', 1)
                ->has('archivedBusinesses', 1)
                ->where('activeBusinesses.0.name', 'Aktif Satu')
                ->where('archivedBusinesses.0.name', 'Arsip Satu')
            );
    }

    public function test_index_does_not_include_another_users_businesses(): void
    {
        $user = User::factory()->create();
        $this->makeBusiness($user, 'Milikku');

        $other = User::factory()->create();
        $this->makeBusiness($other, 'Milik Orang Lain');

        $this->actingAs($user)
            ->get(route('businesses.index'))
            ->assertInertia(fn ($page) => $page
                ->has('activeBusinesses', 1)
                ->where('activeBusinesses.0.name', 'Milikku')
            );
    }

    public function test_index_reports_correct_active_count_and_finite_limit(): void
    {
        $user = User::factory()->create(); // FREE
        $this->makeBusiness($user, 'Aktif', Business::STATUS_ACTIVE);
        $this->makeBusiness($user, 'Arsip', Business::STATUS_ARCHIVED);

        $this->actingAs($user)
            ->get(route('businesses.index'))
            ->assertInertia(fn ($page) => $page
                ->where('activeBusinessCount', 1)
                ->where('businessLimit', 1)
                ->where('canCreateBusiness', false)
            );
    }

    public function test_index_handles_enterprise_null_limit(): void
    {
        $user = User::factory()->create();
        $this->subscribe($user, 'ENTERPRISE');
        $this->makeBusiness($user, 'Cabang 1');
        $this->makeBusiness($user, 'Cabang 2');

        $this->actingAs($user)
            ->get(route('businesses.index'))
            ->assertInertia(fn ($page) => $page
                ->where('activeBusinessCount', 2)
                ->where('businessLimit', null)
                ->where('canCreateBusiness', true)
            );
    }

    public function test_index_eager_loads_profiles(): void
    {
        $user = User::factory()->create();
        $business = $this->makeBusiness($user);
        BusinessProfile::create(['business_id' => $business->id, 'room_count' => 12]);
        ElectricityProfile::create(['business_id' => $business->id, 'power_va' => 2200]);

        $this->actingAs($user)
            ->get(route('businesses.index'))
            ->assertInertia(fn ($page) => $page
                ->where('activeBusinesses.0.business_profile.room_count', 12)
                ->where('activeBusinesses.0.electricity_profile.power_va', 2200)
            );
    }

    // ---------------------------------------------------------------------
    // STORE
    // ---------------------------------------------------------------------

    public function test_user_can_create_business_below_limit(): void
    {
        $user = User::factory()->create(); // FREE, no businesses yet

        $response = $this->actingAs($user)
            ->post(route('businesses.store'), $this->validPayload());

        $response->assertRedirect(route('businesses.index'));
        $response->assertSessionHas('success');

        $business = Business::where('name', 'Kos Baru')->first();
        $this->assertNotNull($business);
        $this->assertSame($user->id, $business->user_id);
        $this->assertSame(Business::STATUS_ACTIVE, $business->status);
        $this->assertNotNull($business->onboarding_completed_at);
    }

    public function test_store_creates_both_profiles(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('businesses.store'), $this->validPayload());

        $business = Business::where('name', 'Kos Baru')->firstOrFail();
        $this->assertNotNull($business->businessProfile);
        $this->assertSame(10, $business->businessProfile->room_count);
        $this->assertSame(8, $business->businessProfile->occupied_room_count);
        $this->assertSame('Catatan usaha', $business->businessProfile->notes);

        $this->assertNotNull($business->electricityProfile);
        $this->assertSame(2200, $business->electricityProfile->power_va);
        $this->assertSame('Catatan listrik', $business->electricityProfile->notes);
    }

    public function test_free_user_at_one_active_business_is_blocked(): void
    {
        $user = User::factory()->create(); // FREE limit = 1
        $this->makeBusiness($user);

        $response = $this->actingAs($user)
            ->post(route('businesses.store'), $this->validPayload());

        $response->assertSessionHasErrors('business_limit');
        $this->assertSame(1, Business::where('user_id', $user->id)->count());
    }

    public function test_archived_business_does_not_count_toward_limit(): void
    {
        $user = User::factory()->create(); // FREE limit = 1
        $this->makeBusiness($user, 'Lama', Business::STATUS_ARCHIVED);

        $response = $this->actingAs($user)
            ->post(route('businesses.store'), $this->validPayload());

        $response->assertRedirect(route('businesses.index'));
        $response->assertSessionHas('success');
        $this->assertSame(2, Business::where('user_id', $user->id)->count());
    }

    public function test_pro_trial_user_can_create_up_to_three_active_businesses(): void
    {
        $user = User::factory()->create();
        $this->subscribe($user, 'PRO_TRIAL'); // limit = 3
        $this->makeBusiness($user, 'Satu');
        $this->makeBusiness($user, 'Dua');

        // Third is allowed.
        $this->actingAs($user)
            ->post(route('businesses.store'), $this->validPayload(['name' => 'Tiga']))
            ->assertSessionHas('success');

        // Fourth is blocked.
        $this->actingAs($user)
            ->post(route('businesses.store'), $this->validPayload(['name' => 'Empat']))
            ->assertSessionHasErrors('business_limit');

        $this->assertSame(3, Business::where('user_id', $user->id)->count());
    }

    public function test_enterprise_user_has_unlimited_creation(): void
    {
        $user = User::factory()->create();
        $this->subscribe($user, 'ENTERPRISE'); // limit = null

        for ($i = 1; $i <= 4; $i++) {
            $this->actingAs($user)
                ->post(route('businesses.store'), $this->validPayload(['name' => "Cabang {$i}"]))
                ->assertSessionHas('success');
        }

        $this->assertSame(4, Business::where('user_id', $user->id)->count());
    }

    public function test_limit_cannot_be_bypassed_with_request_data(): void
    {
        $user = User::factory()->create(); // FREE limit = 1
        $this->makeBusiness($user);
        $other = User::factory()->create();

        // Client attempts to smuggle ownership/status fields.
        $response = $this->actingAs($user)->post(
            route('businesses.store'),
            $this->validPayload(['user_id' => $other->id, 'status' => 'ARCHIVED'])
        );

        $response->assertSessionHasErrors(['user_id', 'status']);
        $this->assertSame(1, Business::where('user_id', $user->id)->count());
        $this->assertSame(0, Business::where('user_id', $other->id)->count());
    }

    public function test_store_rejects_invalid_input(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('businesses.store'), $this->validPayload([
                'name' => '',
                'business_type' => 'NOT_A_TYPE',
                'power_va' => 100, // below 450 VA minimum
            ]))
            ->assertSessionHasErrors(['name', 'business_type', 'power_va']);

        $this->assertSame(0, Business::count());
    }

    public function test_store_rejects_occupied_rooms_exceeding_room_count(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('businesses.store'), $this->validPayload([
                'room_count' => 5,
                'occupied_room_count' => 9,
            ]))
            ->assertSessionHasErrors('occupied_room_count');

        $this->assertSame(0, Business::count());
    }

    public function test_client_supplied_user_id_is_rejected_safely(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();

        $this->actingAs($user)
            ->post(route('businesses.store'), $this->validPayload(['user_id' => $other->id]))
            ->assertSessionHasErrors('user_id');

        $this->assertSame(0, Business::count());
    }

    // ---------------------------------------------------------------------
    // UPDATE
    // ---------------------------------------------------------------------

    public function test_owner_can_update_business_and_both_profiles(): void
    {
        $user = User::factory()->create();
        $business = $this->makeBusiness($user);
        BusinessProfile::create(['business_id' => $business->id, 'room_count' => 5]);
        ElectricityProfile::create(['business_id' => $business->id, 'power_va' => 1300]);

        $response = $this->actingAs($user)->put(
            route('businesses.update', $business),
            $this->validPayload(['name' => 'Kos Direnovasi', 'room_count' => 20, 'occupied_room_count' => 15, 'power_va' => 3500])
        );

        $response->assertRedirect(route('businesses.index'));
        $response->assertSessionHas('success');

        $business->refresh();
        $this->assertSame('Kos Direnovasi', $business->name);
        $this->assertSame(20, $business->businessProfile->room_count);
        $this->assertSame(3500, $business->electricityProfile->power_va);
    }

    public function test_owner_update_creates_missing_profiles(): void
    {
        $user = User::factory()->create();
        $business = $this->makeBusiness($user); // no profiles yet

        $this->assertNull($business->businessProfile);
        $this->assertNull($business->electricityProfile);

        $this->actingAs($user)
            ->put(route('businesses.update', $business), $this->validPayload())
            ->assertSessionHas('success');

        $business->refresh();
        $this->assertNotNull($business->businessProfile);
        $this->assertNotNull($business->electricityProfile);
        $this->assertSame(10, $business->businessProfile->room_count);
        $this->assertSame(2200, $business->electricityProfile->power_va);
    }

    public function test_another_user_cannot_update_the_business(): void
    {
        $owner = User::factory()->create();
        $business = $this->makeBusiness($owner, 'Punya Owner');

        $attacker = User::factory()->create();

        $this->actingAs($attacker)
            ->put(route('businesses.update', $business), $this->validPayload(['name' => 'Dibajak']))
            ->assertForbidden();

        $this->assertSame('Punya Owner', $business->fresh()->name);
    }

    public function test_update_cannot_change_user_id(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $business = $this->makeBusiness($user);

        $this->actingAs($user)
            ->put(route('businesses.update', $business), $this->validPayload(['user_id' => $other->id]))
            ->assertSessionHasErrors('user_id');

        $this->assertSame($user->id, $business->fresh()->user_id);
    }

    public function test_update_cannot_change_status(): void
    {
        $user = User::factory()->create();
        $business = $this->makeBusiness($user);

        $this->actingAs($user)
            ->put(route('businesses.update', $business), $this->validPayload(['status' => 'ARCHIVED']))
            ->assertSessionHasErrors('status');

        $this->assertSame(Business::STATUS_ACTIVE, $business->fresh()->status);
    }

    public function test_update_rejects_invalid_input(): void
    {
        $user = User::factory()->create();
        $business = $this->makeBusiness($user, 'Nama Asli');

        $this->actingAs($user)
            ->put(route('businesses.update', $business), $this->validPayload([
                'name' => '',
                'operating_days_per_month' => 45,
            ]))
            ->assertSessionHasErrors(['name', 'operating_days_per_month']);

        $this->assertSame('Nama Asli', $business->fresh()->name);
    }

    public function test_update_does_not_touch_unrelated_business(): void
    {
        $user = User::factory()->create();
        $this->subscribe($user, 'PRO_TRIAL');
        $target = $this->makeBusiness($user, 'Target');
        $unrelated = $this->makeBusiness($user, 'Tidak Terkait');
        BusinessProfile::create(['business_id' => $unrelated->id, 'room_count' => 7]);

        $this->actingAs($user)
            ->put(route('businesses.update', $target), $this->validPayload(['name' => 'Target Baru']))
            ->assertSessionHas('success');

        $this->assertSame('Tidak Terkait', $unrelated->fresh()->name);
        $this->assertSame(7, $unrelated->fresh()->businessProfile->room_count);
    }
}
