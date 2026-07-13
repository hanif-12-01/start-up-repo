<?php

namespace App\Services;

use App\Models\User;

class JourneyStateResolver
{
    public function hasBusiness(User $user): bool
    {
        return $user->businesses()->exists();
    }

    public function hasCompletedInitialPlanChoice(User $user): bool
    {
        if ($user->initial_plan_selected_at !== null) {
            return true;
        }

        if ($user->subscription()->exists()) {
            return true;
        }

        if ($this->hasBusiness($user)) {
            return true;
        }

        return false;
    }
}
