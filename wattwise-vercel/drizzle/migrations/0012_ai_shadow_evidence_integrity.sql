ALTER TABLE ai_shadow_forecast
DROP CONSTRAINT ai_shadow_forecast_provenance_check;

ALTER TABLE ai_shadow_forecast
ADD CONSTRAINT ai_shadow_forecast_provenance_check
CHECK (data_provenance IN ('UNCLASSIFIED', 'REAL_WATTWISE', 'SYNTHETIC_DEMO'));

ALTER TABLE ai_shadow_forecast
ADD COLUMN history_latest_period_end date,
ADD COLUMN history_temporal_integrity boolean NOT NULL DEFAULT false;

-- Existing AI-05 rows remain conservative: no provenance is reinterpreted and
-- temporal integrity stays false until a new forecast is built with exact dates.
