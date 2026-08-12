-- Narrow provenance only when it is lossless. Truthful UNCLASSIFIED evidence
-- is never rewritten or deleted merely to complete a rollback.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM ai_shadow_forecast WHERE data_provenance = 'UNCLASSIFIED'
  ) THEN
    ALTER TABLE ai_shadow_forecast
    DROP CONSTRAINT ai_shadow_forecast_provenance_check;

    ALTER TABLE ai_shadow_forecast
    ADD CONSTRAINT ai_shadow_forecast_provenance_check
    CHECK (data_provenance IN ('REAL_WATTWISE', 'SYNTHETIC_DEMO'));
  END IF;
END $$;

ALTER TABLE ai_shadow_forecast
DROP COLUMN history_temporal_integrity,
DROP COLUMN history_latest_period_end;
