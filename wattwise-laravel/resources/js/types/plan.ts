export type PlanId = 'FREE' | 'PRO_TRIAL' | 'PRO' | 'BUSINESS' | 'ENTERPRISE';

/**
 * Standardized effective plan contract shared from the backend
 * (App\Services\FeatureGateService::getEffectivePlan). Resolved server-side
 * for the authenticated user and exposed as a shared Inertia prop.
 */
export type EffectivePlan = {
    id: PlanId;
    label: string;
    is_trial: boolean;
    is_expired: boolean;
    trial_ends_at: string | null;
    remaining_trial_days: number;
};
