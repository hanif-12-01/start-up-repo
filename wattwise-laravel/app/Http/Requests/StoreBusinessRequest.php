<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreBusinessRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Ownership is assigned server-side; the plan limit and the create
        // ability are enforced in the controller (policy + FeatureGateService).
        return $this->user() !== null;
    }

    /**
     * Mirrors StoreOnboardingRequest constraints so the two creation paths
     * validate identically. `business_notes`/`electricity_notes` map to the
     * `notes` column of BusinessProfile and ElectricityProfile respectively.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            // Ownership/lifecycle fields must never come from the client.
            'user_id' => ['prohibited'],
            'status' => ['prohibited'],

            // Business
            'name' => ['required', 'string', 'max:120'],
            'business_type' => ['required', 'string', 'in:KOS_PROPERTY,FNB,LAUNDRY,RETAIL,COLD_STORAGE,OTHER'],
            'city' => ['nullable', 'string', 'max:120'],
            'province' => ['nullable', 'string', 'max:120'],
            'address' => ['nullable', 'string', 'max:500'],

            // Business profile
            'room_count' => ['nullable', 'integer', 'min:0', 'max:10000'],
            'occupied_room_count' => ['nullable', 'integer', 'min:0', 'lte:room_count'],
            'employee_count' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'operating_days_per_month' => ['nullable', 'integer', 'min:1', 'max:31'],
            'business_notes' => ['nullable', 'string', 'max:1000'],

            // Electricity profile
            'customer_type' => ['nullable', 'string', 'max:80'],
            'power_va' => ['nullable', 'integer', 'min:450', 'max:200000'],
            'tariff_per_kwh' => ['nullable', 'numeric', 'min:0', 'max:10000'],
            'payment_method' => ['nullable', 'string', 'max:80'],
            'meter_type' => ['nullable', 'string', 'max:80'],
            'electricity_notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'user_id.prohibited' => 'Field kepemilikan tidak boleh dikirim.',
            'status.prohibited' => 'Status bisnis tidak boleh diubah melalui form ini.',
            'name.required' => 'Nama bisnis/properti wajib diisi.',
            'business_type.required' => 'Jenis bisnis wajib dipilih.',
            'business_type.in' => 'Kategori bisnis tidak valid.',
            'power_va.min' => 'Daya listrik minimal adalah 450 VA.',
            'occupied_room_count.lte' => 'Jumlah kamar terisi tidak boleh melebihi jumlah kamar total.',
        ];
    }
}
