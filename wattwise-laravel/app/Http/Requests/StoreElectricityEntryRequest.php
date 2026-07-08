<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreElectricityEntryRequest extends FormRequest
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
            'business_id' => [
                'required',
                Rule::exists('businesses', 'id')->where(function ($query) {
                    $query->where('user_id', $this->user()->id);
                }),
            ],
            'period_month' => ['required', 'date'],
            'usage_kwh' => ['nullable', 'numeric', 'min:0', 'max:1000000'],
            'bill_amount_idr' => ['nullable', 'numeric', 'min:0', 'max:1000000000'],
            'meter_start' => ['nullable', 'numeric', 'min:0'],
            'meter_end' => [
                'nullable',
                'numeric',
                'min:0',
                'gte:meter_start',
            ],
            'tariff_per_kwh' => ['nullable', 'numeric', 'min:0', 'max:10000'],
            'payment_method' => ['nullable', 'string', 'max:80'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * Get the error messages for the defined validation rules.
     */
    public function messages(): array
    {
        return [
            'meter_end.gte' => 'Angka meter akhir harus lebih besar atau sama dengan angka meter awal.',
            'business_id.exists' => 'Usaha yang dipilih tidak valid atau bukan milik Anda.',
        ];
    }
}
