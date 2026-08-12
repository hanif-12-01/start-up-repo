DROP TABLE IF EXISTS ai_shadow_forecast;
ALTER TABLE business DROP CONSTRAINT IF EXISTS business_data_provenance_check;
ALTER TABLE business DROP COLUMN IF EXISTS data_provenance;
