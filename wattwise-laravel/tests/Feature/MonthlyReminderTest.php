<?php

namespace Tests\Feature;

use App\Contracts\WhatsAppGateway;
use App\Models\Business;
use App\Models\NotificationPreference;
use App\Models\ReminderDelivery;
use App\Models\User;
use App\Services\WhatsApp\LogWhatsAppGateway;
use App\Services\WhatsApp\MonthlyReminderSelection;
use App\Services\WhatsApp\MonthlyReminderSelector;
use App\Services\WhatsApp\ReminderMessageBuilder;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Log\Events\MessageLogged;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class MonthlyReminderTest extends TestCase
{
    use RefreshDatabase;

    private const DATE = '2026-07-15';

    private function makeUser(
        int $day = 15,
        bool $enabled = true,
        bool $optedIn = true,
        string $phone = '+6281234567890',
        string $businessStatus = Business::STATUS_ACTIVE,
        bool $withBusiness = true,
    ): User {
        $user = User::factory()->create();

        NotificationPreference::create([
            'user_id' => $user->id,
            'whatsapp_phone' => $phone,
            'whatsapp_enabled' => $enabled,
            'whatsapp_opted_in_at' => $optedIn ? now() : null,
            'monthly_reminder_day' => $day,
            'timezone' => 'Asia/Jakarta',
        ]);

        if ($withBusiness) {
            Business::create([
                'user_id' => $user->id,
                'name' => 'Kos Melati',
                'business_type' => 'KOS_PROPERTY',
                'status' => $businessStatus,
            ]);
        }

        return $user;
    }

    private function select(): MonthlyReminderSelection
    {
        return app(MonthlyReminderSelector::class)->select(CarbonImmutable::parse(self::DATE));
    }

    // -----------------------------------------------------------------
    // Selection rules
    // -----------------------------------------------------------------

    public function test_eligible_user_is_selected(): void
    {
        $this->makeUser();

        $selection = $this->select();

        $this->assertSame(1, $selection->eligibleCount());
        $this->assertSame('2026-07', $selection->period);
    }

    public function test_opted_out_user_is_excluded(): void
    {
        $this->makeUser(enabled: false);
        $this->makeUser(optedIn: false);

        $this->assertSame(0, $this->select()->eligibleCount());
    }

    public function test_user_without_active_business_is_excluded(): void
    {
        $this->makeUser(withBusiness: false);

        $selection = $this->select();
        $this->assertSame(0, $selection->eligibleCount());
        $this->assertSame(1, $selection->skipped);
    }

    public function test_archived_business_does_not_qualify(): void
    {
        $this->makeUser(businessStatus: Business::STATUS_ARCHIVED);

        $selection = $this->select();
        $this->assertSame(0, $selection->eligibleCount());
        $this->assertSame(1, $selection->skipped);
    }

    public function test_day_mismatch_is_not_selected(): void
    {
        $this->makeUser(day: 16);

        $this->assertSame(0, $this->select()->eligibleCount());
    }

    private function makeDelivery(User $user, string $status, string $period = '2026-07'): ReminderDelivery
    {
        return ReminderDelivery::create([
            'user_id' => $user->id,
            'notification_preference_id' => $user->notificationPreference->id,
            'type' => config('whatsapp.reminder_type'),
            'period' => $period,
            'destination_fingerprint' => 'fingerprint',
            'destination_masked' => '+62812*****890',
            'status' => $status,
            'attempted_at' => now(),
        ]);
    }

    public function test_pending_delivery_blocks_eligibility(): void
    {
        $user = $this->makeUser();
        $this->makeDelivery($user, ReminderDelivery::STATUS_PENDING);

        $selection = $this->select();
        $this->assertSame(0, $selection->eligibleCount());
        $this->assertSame(1, $selection->duplicates);
    }

    public function test_sent_delivery_blocks_eligibility(): void
    {
        $user = $this->makeUser();
        $this->makeDelivery($user, ReminderDelivery::STATUS_SENT);

        $selection = $this->select();
        $this->assertSame(0, $selection->eligibleCount());
        $this->assertSame(1, $selection->duplicates);
    }

    public function test_logged_delivery_does_not_block_future_eligibility(): void
    {
        $user = $this->makeUser();
        $this->makeDelivery($user, ReminderDelivery::STATUS_LOGGED);

        $selection = $this->select();
        $this->assertSame(1, $selection->eligibleCount());
        $this->assertSame(0, $selection->duplicates);
    }

    public function test_simulated_delivery_does_not_block_future_eligibility(): void
    {
        $user = $this->makeUser();
        $this->makeDelivery($user, ReminderDelivery::STATUS_SIMULATED);

        $selection = $this->select();
        $this->assertSame(1, $selection->eligibleCount());
        $this->assertSame(0, $selection->duplicates);
    }

    public function test_failed_delivery_does_not_block_retry(): void
    {
        $user = $this->makeUser();
        $this->makeDelivery($user, ReminderDelivery::STATUS_FAILED);

        $selection = $this->select();
        $this->assertSame(1, $selection->eligibleCount());
        $this->assertSame(0, $selection->duplicates);
    }

    // -----------------------------------------------------------------
    // Command behavior
    // -----------------------------------------------------------------

    public function test_dry_run_performs_no_real_delivery(): void
    {
        $gateway = \Mockery::mock(WhatsAppGateway::class);
        $gateway->shouldNotReceive('send');
        $this->app->instance(WhatsAppGateway::class, $gateway);

        $this->makeUser();

        Artisan::call('wattwise:monthly-reminders', ['--date' => self::DATE, '--dry-run' => true]);

        $this->assertSame(0, ReminderDelivery::count());
    }

    public function test_dry_run_masks_phone_and_never_prints_full_number(): void
    {
        $this->makeUser();

        Artisan::call('wattwise:monthly-reminders', ['--date' => self::DATE, '--dry-run' => true]);
        $output = Artisan::output();

        $this->assertStringContainsString('+62812*****890', $output);
        $this->assertStringNotContainsString('6281234567890', $output);
        $this->assertStringNotContainsString('081234567890', $output);
    }

    public function test_non_dry_run_is_blocked_while_feature_disabled(): void
    {
        config()->set('whatsapp.reminders_enabled', false);
        $this->makeUser();

        $exit = Artisan::call('wattwise:monthly-reminders', ['--date' => self::DATE]);
        $output = Artisan::output();

        $this->assertSame(0, $exit);
        $this->assertStringContainsString('dinonaktifkan', $output);
        $this->assertSame(0, ReminderDelivery::count());
    }

    public function test_non_dry_run_records_non_delivering_status_when_enabled(): void
    {
        config()->set('whatsapp.reminders_enabled', true);
        $this->makeUser();

        Artisan::call('wattwise:monthly-reminders', ['--date' => self::DATE]);

        $delivery = ReminderDelivery::firstOrFail();
        $this->assertSame(ReminderDelivery::STATUS_LOGGED, $delivery->status);
        $this->assertNull($delivery->delivered_at);
        $this->assertSame('2026-07', $delivery->period);
    }

    public function test_running_twice_reuses_the_same_row_without_unique_violation(): void
    {
        config()->set('whatsapp.reminders_enabled', true);
        $this->makeUser();

        Artisan::call('wattwise:monthly-reminders', ['--date' => self::DATE]);
        Artisan::call('wattwise:monthly-reminders', ['--date' => self::DATE]);

        // A logged row is non-blocking, so it is reused (updateOrCreate) — no
        // duplicate row and no unique-constraint exception.
        $this->assertSame(1, ReminderDelivery::count());
        $this->assertSame(ReminderDelivery::STATUS_LOGGED, ReminderDelivery::firstOrFail()->status);
    }

    public function test_existing_non_blocking_row_is_updated_not_duplicated(): void
    {
        config()->set('whatsapp.reminders_enabled', true);
        $user = $this->makeUser();
        $existing = $this->makeDelivery($user, ReminderDelivery::STATUS_FAILED);

        Artisan::call('wattwise:monthly-reminders', ['--date' => self::DATE]);

        $this->assertSame(1, ReminderDelivery::count());
        $this->assertSame($existing->id, ReminderDelivery::firstOrFail()->id);
        $this->assertSame(ReminderDelivery::STATUS_LOGGED, $existing->fresh()->status);
    }

    public function test_existing_non_blocking_row_can_transition_to_pending_then_sent(): void
    {
        $user = $this->makeUser();
        $existing = $this->makeDelivery($user, ReminderDelivery::STATUS_FAILED);
        $existing->update(['status' => ReminderDelivery::STATUS_PENDING]);
        $this->assertSame(ReminderDelivery::STATUS_PENDING, $existing->fresh()->status);
        $existing->update(['status' => ReminderDelivery::STATUS_SENT, 'delivered_at' => now()]);
        $this->assertSame(1, ReminderDelivery::count());
        $this->assertSame(ReminderDelivery::STATUS_SENT, $existing->fresh()->status);
        $this->assertNotNull($existing->fresh()->delivered_at);
    }

    public function test_blocking_and_non_blocking_status_sets_are_disjoint(): void
    {
        $this->assertSame(
            ['pending', 'sent'],
            ReminderDelivery::BLOCKING_STATUSES,
        );
        $this->assertSame(
            [],
            array_intersect(ReminderDelivery::BLOCKING_STATUSES, ReminderDelivery::NON_BLOCKING_STATUSES),
        );
    }

    public function test_log_driver_masks_destination_and_never_logs_full_number(): void
    {
        config()->set('whatsapp.reminders_enabled', true);
        $this->makeUser();

        /** @var list<MessageLogged> $entries */
        $entries = [];
        Log::listen(function ($event) use (&$entries): void {
            $entries[] = $event;
        });

        Artisan::call('wattwise:monthly-reminders', ['--date' => self::DATE]);

        $this->assertNotEmpty($entries);
        foreach ($entries as $entry) {
            $encoded = $entry->message.' '.json_encode($entry->context);
            $this->assertStringNotContainsString('6281234567890', $encoded);
            $this->assertStringNotContainsString('081234567890', $encoded);
        }
        $masked = collect($entries)->contains(
            fn ($entry) => ($entry->context['destination'] ?? null) === '+62812*****890'
        );
        $this->assertTrue($masked, 'Expected a masked destination in the log context.');
    }

    public function test_log_driver_result_never_claims_success(): void
    {
        $result = app(LogWhatsAppGateway::class)->send('+6281234567890', 'Safe reminder content');

        $this->assertFalse($result->delivered);
        $this->assertSame(ReminderDelivery::STATUS_LOGGED, $result->status);
        $this->assertNull($result->failureCode);
    }

    public function test_invalid_date_fails_cleanly(): void
    {
        $exitCode = Artisan::call('wattwise:monthly-reminders', ['--date' => 'not-a-date']);

        $this->assertSame(1, $exitCode);
    }

    // -----------------------------------------------------------------
    // Message safety
    // -----------------------------------------------------------------

    public function test_reminder_message_contains_no_financial_amounts(): void
    {
        $message = (new ReminderMessageBuilder)->monthlyReminder('Kos Melati', '2026-07');

        $this->assertStringContainsString('Juli 2026', $message);
        $this->assertStringContainsString('WattWise', $message);
        $this->assertStringContainsString('berdasarkan data yang Anda input', $message);
        // No currency, revenue, or electricity amounts leaked.
        $this->assertStringNotContainsString('Rp', $message);
        $this->assertStringNotContainsString('kWh', $message);
        $this->assertDoesNotMatchRegularExpression('/\d{4,}/', $message === '' ? 'x' : str_replace('2026', '', $message));
    }

    public function test_unsupported_driver_fails_closed(): void
    {
        config()->set('whatsapp.driver', 'unsupported');
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('WhatsApp driver [unsupported] is not supported.');
        app(WhatsAppGateway::class);
    }

    public function test_log_only_gateway_selected(): void
    {
        config()->set('whatsapp.driver', 'log');
        $gateway = app(WhatsAppGateway::class);
        $this->assertInstanceOf(LogWhatsAppGateway::class, $gateway);
    }
}
