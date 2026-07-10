<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class GeneratePredictionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * The business_id must reference a business owned by the authenticated user.
     */
    public function rules(): array
    {
        return [
            'business_id' => [
                'required',
                'integer',
                Rule::exists('businesses', 'id')->where(function ($query) {
                    $query->where('user_id', $this->user()->id)
                        ->where('status', \App\Models\Business::STATUS_ACTIVE);
                }),
            ],
        ];
    }
}
