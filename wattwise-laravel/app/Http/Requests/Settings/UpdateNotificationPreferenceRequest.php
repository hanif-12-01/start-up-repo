<?php

namespace App\Http\Requests\Settings;

use App\Services\WhatsApp\PhoneNormalizer;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class UpdateNotificationPreferenceRequest extends FormRequest
{
    public function authorize(): bool
    {
        // The route is authenticated; a user may only manage their own
        // preference, which the controller resolves from the auth user.
        return $this->user() !== null;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'whatsapp_phone' => ['nullable', 'string', 'max:25'],
            'whatsapp_enabled' => ['required', 'boolean'],
            'consent' => ['nullable', 'boolean'],
            'monthly_reminder_day' => ['nullable', 'integer', 'min:1', 'max:28'],
            'timezone' => ['nullable', 'string', 'max:64'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            /** @var PhoneNormalizer $normalizer */
            $normalizer = app(PhoneNormalizer::class);

            $rawPhone = $this->input('whatsapp_phone');
            $phone = is_string($rawPhone) ? trim($rawPhone) : '';
            $hasValidPhone = $phone !== '' && $normalizer->normalize($phone) !== null;

            // A user may enable using their already-stored number without re-typing it.
            $storedPhone = $this->user()?->notificationPreference?->whatsapp_phone;
            $hasStoredValidPhone = is_string($storedPhone) && $normalizer->normalize($storedPhone) !== null;
            $canUsePhone = $hasValidPhone || ($phone === '' && $hasStoredValidPhone);

            if ($phone !== '' && ! $hasValidPhone) {
                $validator->errors()->add(
                    'whatsapp_phone',
                    'Nomor WhatsApp tidak valid. Gunakan format seperti 08123456789.'
                );
            }

            $timezone = $this->input('timezone');
            if (is_string($timezone) && $timezone !== '' && ! in_array($timezone, timezone_identifiers_list(), true)) {
                $validator->errors()->add('timezone', 'Zona waktu tidak valid.');
            }

            if (! $this->boolean('whatsapp_enabled')) {
                return;
            }

            // Enabling requires explicit consent, a valid number, and a day.
            if (! $this->boolean('consent')) {
                $validator->errors()->add(
                    'consent',
                    'Anda harus menyetujui penerimaan pesan operasional untuk mengaktifkan pengingat.'
                );
            }

            if (! $canUsePhone) {
                $validator->errors()->add(
                    'whatsapp_phone',
                    'Nomor WhatsApp yang valid diperlukan untuk mengaktifkan pengingat.'
                );
            }

            if ($this->input('monthly_reminder_day') === null) {
                $validator->errors()->add(
                    'monthly_reminder_day',
                    'Pilih tanggal pengingat antara 1 dan 28.'
                );
            }
        });
    }
}
