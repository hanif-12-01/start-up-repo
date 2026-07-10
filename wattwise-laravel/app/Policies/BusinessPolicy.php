<?php

namespace App\Policies;

use App\Models\Business;
use App\Models\User;

class BusinessPolicy
{
    /**
     * Any authenticated user may list their own businesses.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Only the owning user may view a business.
     */
    public function view(User $user, Business $business): bool
    {
        return $this->owns($user, $business);
    }

    /**
     * Any authenticated user may attempt to create a business.
     * The plan limit is enforced server-side in the controller.
     */
    public function create(User $user): bool
    {
        return true;
    }

    /**
     * Only the owning user may update a business.
     */
    public function update(User $user, Business $business): bool
    {
        return $this->owns($user, $business);
    }

    /**
     * Declared for Step 11 (archive/restore). No controller action uses
     * these yet — do not wire routes for them in Step 10.
     */
    public function archive(User $user, Business $business): bool
    {
        return $this->owns($user, $business);
    }

    public function restore(User $user, Business $business): bool
    {
        return $this->owns($user, $business);
    }

    private function owns(User $user, Business $business): bool
    {
        return $business->user_id === $user->id;
    }
}
