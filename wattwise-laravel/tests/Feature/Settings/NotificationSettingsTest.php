<?php

namespace Tests\Feature\Settings;

use App\Models\NotificationPreference;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationSettingsTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'whatsapp_phone' => '081234567890',
            'whatsapp_enabled' => true,
            'consent' => true,
            'monthly_reminder_day' => 15,
            'timezone' => 'Asia/Jakarta',
        ], $overrides);
    }

    public function test_notification_settings_page_requires_authentication(): void
    {
        $this->get(route('notifications.edit'))->assertRedirect('/login');
        $this->put(route('notifications.update'), $this->payload())->assertRedirect('/login');
    }

    public function test_authenticated_user_can_open_the_page(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('notifications.edit'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('settings/Notifications'));
    }

    public function test_raw_phone_is_never_exposed_only_masked(): void
    {
        $user = User::factory()->create();
        NotificationPreference::create([
            'user_id' => $user->id,
            'whatsapp_phone' => '+6281234567890',
            'whatsapp_enabled' => true,
            'whatsapp_opted_in_at' => now(),
            'monthly_reminder_day' => 10,
            'timezone' => 'Asia/Jakarta',
        ]);

        $this->actingAs($user)
            ->get(route('notifications.edit'))
            ->assertInertia(fn ($page) => $page
                ->where('preference.masked_phone', '+62812*****890')
                ->where('preference.has_phone', true)
                ->missing('preference.whatsapp_phone')
            );
    }

    public function test_user_can_enable_reminders_with_consent_and_valid_phone(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->put(route('notifications.update'), $this->payload())
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('notifications.edit'));

        $preference = $user->notificationPreference()->firstOrFail();
        $this->assertTrue($preference->whatsapp_enabled);
        $this->assertSame('+6281234567890', $preference->whatsapp_phone);
        $this->assertSame(15, $preference->monthly_reminder_day);
        $this->assertNotNull($preference->whatsapp_opted_in_at);
    }

    public function test_enabling_requires_explicit_consent(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->put(route('notifications.update'), $this->payload(['consent' => false]))
            ->assertSessionHasErrors('consent');

        $this->assertNull($user->notificationPreference()->first()?->whatsapp_opted_in_at);
    }

    public function test_enabling_requires_a_valid_phone(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->put(route('notifications.update'), $this->payload(['whatsapp_phone' => '']))
            ->assertSessionHasErrors('whatsapp_phone');

        $this->assertFalse((bool) $user->notificationPreference()->first()?->whatsapp_enabled);
    }

    public function test_invalid_phone_is_rejected(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->put(route('notifications.update'), $this->payload(['whatsapp_phone' => '+1234567890']))
            ->assertSessionHasErrors('whatsapp_phone');
    }

    public function test_opt_in_timestamp_is_recorded_on_enable(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->put(route('notifications.update'), $this->payload());

        $this->assertNotNull($user->notificationPreference()->firstOrFail()->whatsapp_opted_in_at);
    }

    public function test_disabling_stops_eligibility(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->put(route('notifications.update'), $this->payload());

        $this->actingAs($user)->put(route('notifications.update'), $this->payload([
            'whatsapp_enabled' => false,
            'consent' => false,
        ]))->assertSessionHasNoErrors();

        $preference = $user->notificationPreference()->firstOrFail();
        $this->assertFalse($preference->whatsapp_enabled);
        $this->assertNull($preference->whatsapp_opted_in_at);
    }

    public function test_removing_the_phone_disables_reminders(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->put(route('notifications.update'), $this->payload());

        $this->actingAs($user)
            ->delete(route('notifications.destroy'))
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('notifications.edit'));

        $preference = $user->notificationPreference()->firstOrFail();
        $this->assertNull($preference->whatsapp_phone);
        $this->assertFalse($preference->whatsapp_enabled);
        $this->assertNull($preference->whatsapp_opted_in_at);
    }

    public function test_reminder_day_must_be_between_one_and_twenty_eight(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->put(route('notifications.update'), $this->payload(['monthly_reminder_day' => 0]))
            ->assertSessionHasErrors('monthly_reminder_day');

        $this->actingAs($user)
            ->put(route('notifications.update'), $this->payload(['monthly_reminder_day' => 29]))
            ->assertSessionHasErrors('monthly_reminder_day');
    }

    public function test_a_user_only_affects_their_own_preference(): void
    {
        $other = User::factory()->create();
        NotificationPreference::create([
            'user_id' => $other->id,
            'whatsapp_phone' => '+6289900001111',
            'whatsapp_enabled' => true,
            'whatsapp_opted_in_at' => now(),
            'monthly_reminder_day' => 5,
            'timezone' => 'Asia/Jakarta',
        ]);

        $user = User::factory()->create();
        $this->actingAs($user)->put(route('notifications.update'), $this->payload());

        // The other user's preference is untouched.
        $otherPreference = $other->notificationPreference()->firstOrFail();
        $this->assertSame('+6289900001111', $otherPreference->whatsapp_phone);
        $this->assertSame(5, $otherPreference->monthly_reminder_day);
        // Each user owns exactly one preference row.
        $this->assertSame(1, NotificationPreference::where('user_id', $user->id)->count());
        $this->assertSame(1, NotificationPreference::where('user_id', $other->id)->count());
    }

    public function test_feature_is_disabled_by_default(): void
    {
        $this->assertFalse((bool) config('whatsapp.reminders_enabled'));
        $this->assertSame('log', config('whatsapp.driver'));
    }
}
