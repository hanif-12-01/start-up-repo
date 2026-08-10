ALTER TABLE electricity_bill
ADD COLUMN kwh_source text NOT NULL DEFAULT 'LEGACY_UNKNOWN';

ALTER TABLE electricity_bill
ADD CONSTRAINT electricity_bill_kwh_source_check
CHECK (kwh_source IN ('USER_ENTERED', 'METER_DERIVED', 'LEGACY_UNKNOWN'));

UPDATE electricity_bill
SET kwh_source = 'LEGACY_UNKNOWN'
WHERE kwh_source IS NULL OR kwh_source = '';
