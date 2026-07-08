<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRevenueEntryRequest extends FormRequest
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
            'revenue_amount_idr' => ['nullable', 'numeric', 'min:0', 'max:100000000000'],
            'revenue_input_mode' => ['required', 'string', Rule::in(['EXACT', 'RANGE', 'SKIP'])],
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
            'revenue_input_mode.in' => 'Mode input pendapatan tidak valid.',
        ];
    }
}
