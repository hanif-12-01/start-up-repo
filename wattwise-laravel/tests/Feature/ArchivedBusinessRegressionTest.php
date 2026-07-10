<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\BusinessProfile;
use App\Models\ElectricityProfile;
use App\Models\ElectricityEntry;
use App\Models\RevenueEntry;
use App\Models\Appliance;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class ArchivedBusinessRegressionTest extends TestCase
{
    use RefreshDatabase;

    private function makeBusiness(User $user, string $name = 'Kos A', string $status = Business::STATUS_ACTIVE): Business
    {
        $business = Business::create([
            'user_id' => $user->id,
            'name' => $name,
            'business_type' => 'KOS_PROPERTY',
            'status' => $status,
        ]);

        BusinessProfile::create(['business_id' => $business->id, 'room_count' => 10]);
        ElectricityProfile::create(['business_id' => $business->id, 'power_va' => 1300]);

        return $business;
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

    // ---------------------------------------------------------------------
    // ARCHIVE TESTS
    // ---------------------------------------------------------------------

    public function test_guest_cannot_archive_business(): void
    {
        $owner = User::factory()->create();
        $business = $this->makeBusiness($owner);

        $this->post(route('businesses.archive', $business))
            ->assertRedirect('/login');
    }

    public function test_owner_can_archive_business_when_another_active_remains(): void
    {
        $user = User::factory()->create();
        $businessToArchive = $this->makeBusiness($user, 'Usaha A');
        $otherActive = $this->makeBusiness($user, 'Usaha B');

        // Add dummy historical data
        ElectricityEntry::create([
            'business_id' => $businessToArchive->id,
            'period_month' => '2026-06-01',
            'usage_kwh' => 100,
            'bill_amount_idr' => 150000,
        ]);
        RevenueEntry::create([
            'business_id' => $businessToArchive->id,
            'period_month' => '2026-06-01',
            'revenue_amount_idr' => 1000000,
            'revenue_input_mode' => 'EXACT',
        ]);
        Appliance::create([
            'business_id' => $businessToArchive->id,
            'name' => 'Kulkas',
            'quantity' => 1,
            'source' => 'MANUAL',
            'confidence' => 'USER_CUSTOM',
        ]);

        $response = $this->actingAs($user)
            ->post(route('businesses.archive', $businessToArchive));

        $response->assertRedirect(route('businesses.index'));
        $response->assertSessionHas('success', 'Usaha atau properti berhasil diarsipkan. Seluruh data historis tetap tersimpan.');

        $businessToArchive->refresh();
        $this->assertSame(Business::STATUS_ARCHIVED, $businessToArchive->status);

        // Verify history preserved
        $this->assertNotNull($businessToArchive->businessProfile);
        $this->assertNotNull($businessToArchive->electricityProfile);
        $this->assertCount(1, $businessToArchive->electricityEntries);
        $this->assertCount(1, $businessToArchive->revenueEntries);
        $this->assertCount(1, $businessToArchive->appliances);
    }

    public function test_another_user_cannot_archive_the_business(): void
    {
        $owner = User::factory()->create();
        $business = $this->makeBusiness($owner);
        $other = User::factory()->create();

        $this->actingAs($other)
            ->post(route('businesses.archive', $business))
            ->assertForbidden();

        $this->assertSame(Business::STATUS_ACTIVE, $business->fresh()->status);
    }

    public function test_last_active_business_cannot_be_archived(): void
    {
        $user = User::factory()->create();
        $business = $this->makeBusiness($user);

        $response = $this->actingAs($user)
            ->post(route('businesses.archive', $business));

        $response->assertSessionHasErrors('business_archive');
        $this->assertSame(Business::STATUS_ACTIVE, $business->fresh()->status);
    }

    public function test_already_archived_business_is_handled_safely(): void
    {
        $user = User::factory()->create();
        $business = $this->makeBusiness($user, 'Usaha A', Business::STATUS_ARCHIVED);
        $this->makeBusiness($user, 'Usaha B'); // Keep one active

        $response = $this->actingAs($user)
            ->post(route('businesses.archive', $business));

        $response->assertRedirect(route('businesses.index'));
        $response->assertSessionHas('success');
        $this->assertSame(Business::STATUS_ARCHIVED, $business->fresh()->status);
    }

    public function test_archived_business_moves_from_active_to_archived_businesses_list(): void
    {
        $user = User::factory()->create();
        $business = $this->makeBusiness($user, 'Usaha A');
        $this->makeBusiness($user, 'Usaha B');

        $this->actingAs($user)
            ->get(route('businesses.index'))
            ->assertInertia(fn ($page) => $page
                ->has('activeBusinesses', 2)
                ->has('archivedBusinesses', 0)
            );

        $this->actingAs($user)->post(route('businesses.archive', $business));

        $this->actingAs($user)
            ->get(route('businesses.index'))
            ->assertInertia(fn ($page) => $page
                ->has('activeBusinesses', 1)
                ->has('archivedBusinesses', 1)
                ->where('activeBusinesses.0.name', 'Usaha B')
                ->where('archivedBusinesses.0.name', 'Usaha A')
            );
    }

    // ---------------------------------------------------------------------
    // RESTORE TESTS
    // ---------------------------------------------------------------------

    public function test_owner_can_restore_archived_business_below_plan_limit(): void
    {
        $user = User::factory()->create(); // FREE: limit 1
        $this->subscribe($user, 'PRO'); // limit 3
        $this->makeBusiness($user, 'Usaha Aktif 1');
        $this->makeBusiness($user, 'Usaha Aktif 2');
        $businessToRestore = $this->makeBusiness($user, 'Usaha Arsip', Business::STATUS_ARCHIVED);

        $response = $this->actingAs($user)
            ->post(route('businesses.restore', $businessToRestore));

        $response->assertRedirect(route('businesses.index'));
        $response->assertSessionHas('success', 'Usaha atau properti berhasil dipulihkan dan kembali aktif.');
        $this->assertSame(Business::STATUS_ACTIVE, $businessToRestore->fresh()->status);
    }

    public function test_another_user_cannot_restore_the_business(): void
    {
        $owner = User::factory()->create();
        $business = $this->makeBusiness($owner, 'Arsip', Business::STATUS_ARCHIVED);
        $other = User::factory()->create();

        $this->actingAs($other)
            ->post(route('businesses.restore', $business))
            ->assertForbidden();

        $this->assertSame(Business::STATUS_ARCHIVED, $business->fresh()->status);
    }

    public function test_free_user_at_active_limit_cannot_restore(): void
    {
        $user = User::factory()->create(); // FREE: limit 1
        $this->makeBusiness($user, 'Usaha Aktif');
        $businessToRestore = $this->makeBusiness($user, 'Usaha Arsip', Business::STATUS_ARCHIVED);

        $response = $this->actingAs($user)
            ->post(route('businesses.restore', $businessToRestore));

        $response->assertSessionHasErrors('business_limit');
        $this->assertSame(Business::STATUS_ARCHIVED, $businessToRestore->fresh()->status);
    }

    public function test_pro_trial_user_below_limit_can_restore(): void
    {
        $user = User::factory()->create();
        $this->subscribe($user, 'PRO_TRIAL'); // limit 3
        $this->makeBusiness($user, 'Usaha Aktif 1');
        $businessToRestore = $this->makeBusiness($user, 'Usaha Arsip', Business::STATUS_ARCHIVED);

        $response = $this->actingAs($user)
            ->post(route('businesses.restore', $businessToRestore));

        $response->assertRedirect(route('businesses.index'));
        $this->assertSame(Business::STATUS_ACTIVE, $businessToRestore->fresh()->status);
    }

    public function test_pro_trial_user_at_limit_cannot_restore(): void
    {
        $user = User::factory()->create();
        $this->subscribe($user, 'PRO_TRIAL'); // limit 3
        $this->makeBusiness($user, 'Usaha Aktif 1');
        $this->makeBusiness($user, 'Usaha Aktif 2');
        $this->makeBusiness($user, 'Usaha Aktif 3');
        $businessToRestore = $this->makeBusiness($user, 'Usaha Arsip', Business::STATUS_ARCHIVED);

        $response = $this->actingAs($user)
            ->post(route('businesses.restore', $businessToRestore));

        $response->assertSessionHasErrors('business_limit');
        $this->assertSame(Business::STATUS_ARCHIVED, $businessToRestore->fresh()->status);
    }

    public function test_enterprise_user_with_null_limit_can_restore(): void
    {
        $user = User::factory()->create();
        $this->subscribe($user, 'ENTERPRISE'); // limit null
        // Create multiple active businesses
        for ($i = 1; $i <= 5; $i++) {
            $this->makeBusiness($user, "Usaha Aktif {$i}");
        }
        $businessToRestore = $this->makeBusiness($user, 'Usaha Arsip', Business::STATUS_ARCHIVED);

        $response = $this->actingAs($user)
            ->post(route('businesses.restore', $businessToRestore));

        $response->assertRedirect(route('businesses.index'));
        $this->assertSame(Business::STATUS_ACTIVE, $businessToRestore->fresh()->status);
    }

    public function test_already_active_business_restore_is_handled_safely(): void
    {
        $user = User::factory()->create();
        $business = $this->makeBusiness($user);

        $response = $this->actingAs($user)
            ->post(route('businesses.restore', $business));

        $response->assertRedirect(route('businesses.index'));
        $response->assertSessionHas('success');
        $this->assertSame(Business::STATUS_ACTIVE, $business->fresh()->status);
    }

    public function test_restore_never_automatically_archives_another_business(): void
    {
        $user = User::factory()->create();
        $this->subscribe($user, 'PRO'); // limit 3
        $active1 = $this->makeBusiness($user, 'Aktif 1');
        $active2 = $this->makeBusiness($user, 'Aktif 2');
        $archived = $this->makeBusiness($user, 'Arsip', Business::STATUS_ARCHIVED);

        $this->actingAs($user)
            ->post(route('businesses.restore', $archived))
            ->assertRedirect(route('businesses.index'));

        $this->assertSame(Business::STATUS_ACTIVE, $active1->fresh()->status);
        $this->assertSame(Business::STATUS_ACTIVE, $active2->fresh()->status);
        $this->assertSame(Business::STATUS_ACTIVE, $archived->fresh()->status);
    }

    // ---------------------------------------------------------------------
    // OPERATIONAL FILTERING & MUTATION BLOCK TESTS
    // ---------------------------------------------------------------------

    public function test_archived_business_cannot_be_selected_in_operational_views(): void
    {
        $user = User::factory()->create();
        $activeBusiness = $this->makeBusiness($user, 'Aktif');
        $archivedBusiness = $this->makeBusiness($user, 'Arsip', Business::STATUS_ARCHIVED);

        // Dashboard
        $this->actingAs($user)
            ->get(route('dashboard', ['business_id' => $archivedBusiness->id]))
            ->assertInertia(fn ($page) => $page
                ->where('activeBusinessId', $activeBusiness->id)
            );

        // Predictions
        $this->actingAs($user)
            ->get(route('predictions.index', ['business_id' => $archivedBusiness->id]))
            ->assertInertia(fn ($page) => $page
                ->where('activeBusinessId', $activeBusiness->id)
            );

        // Anomalies
        $this->actingAs($user)
            ->get(route('anomalies.index', ['business_id' => $archivedBusiness->id]))
            ->assertInertia(fn ($page) => $page
                ->where('activeBusinessId', $activeBusiness->id)
            );

        // Recommendations
        $this->actingAs($user)
            ->get(route('recommendations.index', ['business_id' => $archivedBusiness->id]))
            ->assertInertia(fn ($page) => $page
                ->where('activeBusinessId', $activeBusiness->id)
            );
    }

    public function test_creating_electricity_data_for_archived_business_is_rejected(): void
    {
        $user = User::factory()->create();
        $archivedBusiness = $this->makeBusiness($user, 'Arsip', Business::STATUS_ARCHIVED);

        $response = $this->actingAs($user)
            ->post(route('electricity.store'), [
                'business_id' => $archivedBusiness->id,
                'period_month' => '2026-06-01',
                'usage_kwh' => 150,
                'tariff_per_kwh' => 1444,
                'payment_method' => 'Pascabayar',
            ]);

        $response->assertSessionHasErrors('business_id');
        $this->assertCount(0, ElectricityEntry::where('business_id', $archivedBusiness->id)->get());
    }

    public function test_creating_revenue_data_for_archived_business_is_rejected(): void
    {
        $user = User::factory()->create();
        $archivedBusiness = $this->makeBusiness($user, 'Arsip', Business::STATUS_ARCHIVED);

        $response = $this->actingAs($user)
            ->post(route('revenue.store'), [
                'business_id' => $archivedBusiness->id,
                'period_month' => '2026-06-01',
                'revenue_amount_idr' => 5000000,
                'revenue_input_mode' => 'EXACT',
            ]);

        $response->assertSessionHasErrors('business_id');
        $this->assertCount(0, RevenueEntry::where('business_id', $archivedBusiness->id)->get());
    }

    public function test_creating_appliance_data_for_archived_business_is_rejected(): void
    {
        $user = User::factory()->create();
        $archivedBusiness = $this->makeBusiness($user, 'Arsip', Business::STATUS_ARCHIVED);

        $response = $this->actingAs($user)
            ->post(route('appliances.store'), [
                'business_id' => $archivedBusiness->id,
                'name' => 'AC',
                'quantity' => 2,
            ]);

        $response->assertSessionHasErrors('business_id');
        $this->assertCount(0, Appliance::where('business_id', $archivedBusiness->id)->get());
    }

    public function test_applying_appliance_template_to_archived_business_is_rejected(): void
    {
        $user = User::factory()->create();
        $archivedBusiness = $this->makeBusiness($user, 'Arsip', Business::STATUS_ARCHIVED);

        $response = $this->actingAs($user)
            ->post(route('appliances.apply-template'), [
                'business_id' => $archivedBusiness->id,
            ]);

        $response->assertSessionHasErrors('business_id');
    }

    public function test_updating_appliance_of_archived_business_is_rejected(): void
    {
        $user = User::factory()->create();
        $archivedBusiness = $this->makeBusiness($user, 'Arsip', Business::STATUS_ARCHIVED);
        $appliance = Appliance::create([
            'business_id' => $archivedBusiness->id,
            'name' => 'Lampu',
            'quantity' => 10,
            'source' => 'MANUAL',
            'confidence' => 'USER_CUSTOM',
        ]);

        $response = $this->actingAs($user)
            ->put(route('appliances.update', $appliance), [
                'name' => 'Lampu LED',
                'quantity' => 12,
            ]);

        $response->assertForbidden();
        $this->assertSame('Lampu', $appliance->fresh()->name);
    }

    public function test_deleting_appliance_of_archived_business_is_rejected(): void
    {
        $user = User::factory()->create();
        $archivedBusiness = $this->makeBusiness($user, 'Arsip', Business::STATUS_ARCHIVED);
        $appliance = Appliance::create([
            'business_id' => $archivedBusiness->id,
            'name' => 'Lampu',
            'quantity' => 10,
            'source' => 'MANUAL',
            'confidence' => 'USER_CUSTOM',
        ]);

        $response = $this->actingAs($user)
            ->delete(route('appliances.destroy', $appliance));

        $response->assertForbidden();
        $this->assertNotNull($appliance->fresh());
    }

    public function test_archived_owned_business_cannot_be_updated(): void
    {
        $user = User::factory()->create();
        $business = $this->makeBusiness($user, 'Target', Business::STATUS_ARCHIVED);

        $response = $this->actingAs($user)->put(
            route('businesses.update', $business),
            [
                'name' => 'Nama Baru',
                'business_type' => 'LAUNDRY',
                'city' => 'Bandung',
                'province' => 'Jawa Barat',
                'address' => 'Alamat Baru',
                'room_count' => 12,
                'occupied_room_count' => 10,
                'employee_count' => 5,
                'operating_days_per_month' => 25,
                'business_notes' => 'Catatan Baru',
                'customer_type' => 'R1',
                'power_va' => 2200,
                'tariff_per_kwh' => 1500,
                'payment_method' => 'PRABAYAR',
                'meter_type' => 'Token',
                'electricity_notes' => 'Catatan Listrik Baru',
            ]
        );

        $response->assertSessionHasErrors('business_status');

        $business->refresh();
        $this->assertSame('Target', $business->name);
        $this->assertSame(10, $business->businessProfile->room_count);
        $this->assertSame(1300, $business->electricityProfile->power_va);
    }
}
