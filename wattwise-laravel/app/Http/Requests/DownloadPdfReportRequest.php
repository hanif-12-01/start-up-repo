<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class DownloadPdfReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'month' => [
                'required',
                'regex:/^\d{4}-(0[1-9]|1[0-2])$/',
                'date_format:Y-m',
            ],
        ];
    }
}
