<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreOnboardingRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'business_type' => ['required', 'string', 'in:KOS_PROPERTY,FNB,LAUNDRY,RETAIL,COLD_STORAGE,OTHER'],
            'city' => ['nullable', 'string', 'max:120'],
            'province' => ['nullable', 'string', 'max:120'],
            'customer_type' => ['nullable', 'string', 'max:80'],
            'power_va' => ['nullable', 'integer', 'min:450', 'max:200000'],
            'tariff_per_kwh' => ['nullable', 'numeric', 'min:0', 'max:10000'],
            'payment_method' => ['nullable', 'string', 'max:80'],
            'room_count' => ['nullable', 'integer', 'min:0', 'max:10000'],
            'occupied_room_count' => ['nullable', 'integer', 'min:0', 'lte:room_count'],
            'operating_days_per_month' => ['nullable', 'integer', 'min:1', 'max:31'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Nama bisnis/properti wajib diisi.',
            'business_type.required' => 'Jenis bisnis wajib dipilih.',
            'business_type.in' => 'Kategori bisnis tidak valid.',
            'power_va.min' => 'Daya listrik minimal adalah 450 VA.',
            'occupied_room_count.lte' => 'Jumlah kamar terisi tidak boleh melebihi jumlah kamar total.',
        ];
    }
}
