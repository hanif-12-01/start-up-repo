<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreApplianceRequest extends FormRequest
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
                    $query->where('user_id', $this->user()->id)
                        ->where('status', \App\Models\Business::STATUS_ACTIVE);
                }),
            ],
            'name' => ['required', 'string', 'max:120'],
            'category' => ['nullable', 'string', 'max:80'],
            'watt' => ['nullable', 'numeric', 'min:0', 'max:1000000'],
            'quantity' => ['required', 'integer', 'min:1', 'max:10000'],
            'hours_per_day' => ['nullable', 'numeric', 'min:0', 'max:24'],
            'days_per_month' => ['nullable', 'integer', 'min:0', 'max:31'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * Get the error messages for the defined validation rules.
     */
    public function messages(): array
    {
        return [
            'business_id.exists' => 'Usaha yang dipilih tidak valid atau bukan milik Anda.',
            'name.required' => 'Nama peralatan wajib diisi.',
            'name.max' => 'Nama peralatan maksimal 120 karakter.',
            'quantity.required' => 'Jumlah unit wajib diisi.',
            'quantity.min' => 'Jumlah unit minimal 1.',
            'watt.min' => 'Daya (Watt) tidak boleh negatif.',
            'hours_per_day.max' => 'Jam per hari maksimal 24.',
            'days_per_month.max' => 'Hari per bulan maksimal 31.',
        ];
    }
}
