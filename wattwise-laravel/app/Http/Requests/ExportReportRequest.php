<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ExportReportRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Checked at the middleware/controller level
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'month' => [
                'nullable',
                'regex:/^\d{4}-(0[1-9]|1[0-2])$/',
                'date_format:Y-m',
            ],
        ];
    }
}
