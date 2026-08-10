ALTER TABLE electricity_bill DROP CONSTRAINT IF EXISTS electricity_bill_kwh_source_check;
ALTER TABLE electricity_bill DROP COLUMN IF EXISTS kwh_source;
