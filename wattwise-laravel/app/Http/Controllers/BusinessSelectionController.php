<?php

namespace App\Http\Controllers;

use App\Http\Requests\SelectBusinessRequest;
use App\Services\ActiveBusinessResolver;
use Illuminate\Validation\ValidationException;

class BusinessSelectionController extends Controller
{
    public function __construct(
        private readonly ActiveBusinessResolver $resolver
    ) {}

    /**
     * Handle the persistent business selection request.
     */
    public function __invoke(SelectBusinessRequest $request)
    {
        $businessId = (int) $request->validated()['business_id'];

        try {
            $this->resolver->select($request, $businessId);
        } catch (\InvalidArgumentException $e) {
            throw ValidationException::withMessages([
                'business_selection' => $e->getMessage(),
            ]);
        }

        return redirect()->back();
    }
}
