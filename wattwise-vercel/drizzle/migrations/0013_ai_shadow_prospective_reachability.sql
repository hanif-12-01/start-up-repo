ALTER TABLE ai_shadow_forecast
ADD COLUMN target_outcome_unknown_at_forecast boolean NOT NULL DEFAULT false,
ADD COLUMN forecast_days_into_target integer;

ALTER TABLE ai_shadow_forecast
ADD CONSTRAINT ai_shadow_forecast_timing_check
CHECK (forecast_days_into_target IS NULL OR forecast_days_into_target >= 0);

-- Existing rows remain conservative and are never auto-promoted.
