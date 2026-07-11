<?php

namespace App\Services\Demo;

enum DemoLoginReadinessReason: string
{
    case Ready = 'ready';
    case FeatureDisabled = 'feature_disabled';
    case UnsafeEnvironment = 'unsafe_environment';
    case MissingUser = 'missing_user';
    case UnverifiedEmail = 'unverified_email';
    case InvalidPassword = 'invalid_password';
    case AuthValidationFailed = 'auth_validation_failed';
    case MissingBusiness = 'missing_business';
    case MissingBaseline = 'missing_baseline';
    case MissingSubscription = 'missing_subscription';
    case UnusableSubscription = 'unusable_subscription';
}
