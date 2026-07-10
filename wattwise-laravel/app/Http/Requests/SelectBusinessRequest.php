<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SelectBusinessRequest extends FormRequest
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
            'business_id' => ['required', 'integer'],
        ];
    }
}
