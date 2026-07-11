<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\UpdateNotificationPreferenceRequest;
use App\Services\WhatsApp\PhoneNormalizer;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    public function __construct(
        private readonly PhoneNormalizer $normalizer,
    ) {}

    /**
     * Show the notification settings page. The raw phone is never exposed —
     * only a masked value and a boolean indicating whether one is stored.
     */
    public function edit(Request $request): Response
    {
        // firstOrNew returns an unsaved instance for users with no preference
        // yet (no DB write), so defaults render cleanly.
        $preference = $request->user()->notificationPreference()->firstOrNew([]);

        return Inertia::render('settings/Notifications', [
            'preference' => [
                'has_phone' => $preference->whatsapp_phone !== null && $preference->whatsapp_phone !== '',
                'masked_phone' => $preference->whatsapp_phone
                    ? $this->normalizer->mask($preference->whatsapp_phone)
                    : null,
                'whatsapp_enabled' => (bool) $preference->whatsapp_enabled,
                'opted_in' => $preference->whatsapp_opted_in_at !== null,
                'monthly_reminder_day' => $preference->monthly_reminder_day,
                'timezone' => $preference->timezone ?? (string) config('whatsapp.timezone'),
            ],
        ]);
    }

    /**
     * Update the authenticated user's WhatsApp reminder preferences.
     */
    public function update(UpdateNotificationPreferenceRequest $request): RedirectResponse
    {
        $user = $request->user();
        $validated = $request->validated();

        $preference = $user->notificationPreference()->firstOrNew([]);
        $preference->user_id = $user->id;

        $enabled = (bool) $validated['whatsapp_enabled'];
        $storedPhone = $preference->whatsapp_phone;
        $submittedPhone = isset($validated['whatsapp_phone']) && trim((string) $validated['whatsapp_phone']) !== ''
            ? $this->normalizer->normalize((string) $validated['whatsapp_phone'])
            : null;

        if (array_key_exists('timezone', $validated) && $validated['timezone']) {
            $preference->timezone = (string) $validated['timezone'];
        } elseif ($preference->timezone === null) {
            $preference->timezone = (string) config('whatsapp.timezone');
        }

        if (array_key_exists('monthly_reminder_day', $validated) && $validated['monthly_reminder_day'] !== null) {
            $preference->monthly_reminder_day = (int) $validated['monthly_reminder_day'];
        }

        if ($enabled) {
            // A valid phone is guaranteed by validation (submitted or stored).
            $preference->whatsapp_phone = $submittedPhone ?? $storedPhone;
            $preference->whatsapp_enabled = true;
            if ($preference->whatsapp_opted_in_at === null) {
                $preference->whatsapp_opted_in_at = Carbon::now();
            }
        } else {
            // Keep a newly-provided number, but disabling withdraws consent.
            if ($submittedPhone !== null) {
                $preference->whatsapp_phone = $submittedPhone;
            }
            $preference->whatsapp_enabled = false;
            $preference->whatsapp_opted_in_at = null;
        }

        $preference->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Preferensi pengingat diperbarui.']);

        return to_route('notifications.edit');
    }

    /**
     * Remove the stored WhatsApp number and disable reminders.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $preference = $request->user()->notificationPreference()->first();

        if ($preference !== null) {
            $preference->whatsapp_phone = null;
            $preference->whatsapp_enabled = false;
            $preference->whatsapp_opted_in_at = null;
            $preference->save();
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Nomor WhatsApp dihapus dan pengingat dinonaktifkan.']);

        return to_route('notifications.edit');
    }
}
