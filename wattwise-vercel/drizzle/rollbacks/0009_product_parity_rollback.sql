DROP TABLE IF EXISTS "sandbox_payment";
DROP TABLE IF EXISTS "sandbox_invoice";
DROP TABLE IF EXISTS "billing_plan";

ALTER TABLE "user_plan" DROP CONSTRAINT IF EXISTS "user_plan_status_check";
ALTER TABLE "user_plan" DROP CONSTRAINT IF EXISTS "user_plan_plan_check";
ALTER TABLE "user_plan"
  DROP COLUMN IF EXISTS "cancelled_at",
  DROP COLUMN IF EXISTS "current_period_ends_at",
  DROP COLUMN IF EXISTS "current_period_starts_at",
  DROP COLUMN IF EXISTS "trial_used_at",
  DROP COLUMN IF EXISTS "status";
ALTER TABLE "user_plan" ADD CONSTRAINT "user_plan_plan_check" CHECK ("plan" IN ('FREE', 'PRO_TRIAL'));

ALTER TABLE "appliance" DROP CONSTRAINT IF EXISTS "appliance_confidence_check";
ALTER TABLE "appliance" DROP COLUMN IF EXISTS "notes", DROP COLUMN IF EXISTS "confidence";

ALTER TABLE "electricity_bill" DROP CONSTRAINT IF EXISTS "electricity_bill_meter_order_check";
ALTER TABLE "electricity_bill" DROP CONSTRAINT IF EXISTS "electricity_bill_meter_end_check";
ALTER TABLE "electricity_bill" DROP CONSTRAINT IF EXISTS "electricity_bill_meter_start_check";
ALTER TABLE "electricity_bill" DROP COLUMN IF EXISTS "payment_method", DROP COLUMN IF EXISTS "meter_end", DROP COLUMN IF EXISTS "meter_start";

ALTER TABLE "business" DROP CONSTRAINT IF EXISTS "business_tariff_check";
ALTER TABLE "business" DROP CONSTRAINT IF EXISTS "business_power_va_check";
ALTER TABLE "business" DROP CONSTRAINT IF EXISTS "business_operating_days_check";
ALTER TABLE "business" DROP CONSTRAINT IF EXISTS "business_employee_count_check";
ALTER TABLE "business" DROP CONSTRAINT IF EXISTS "business_occupied_room_count_check";
ALTER TABLE "business"
  DROP COLUMN IF EXISTS "archived_at",
  DROP COLUMN IF EXISTS "electricity_notes",
  DROP COLUMN IF EXISTS "meter_type",
  DROP COLUMN IF EXISTS "payment_method",
  DROP COLUMN IF EXISTS "tariff_rupiah_per_kwh",
  DROP COLUMN IF EXISTS "power_va",
  DROP COLUMN IF EXISTS "customer_type",
  DROP COLUMN IF EXISTS "business_notes",
  DROP COLUMN IF EXISTS "operating_days_per_month",
  DROP COLUMN IF EXISTS "employee_count",
  DROP COLUMN IF EXISTS "occupied_room_count",
  DROP COLUMN IF EXISTS "address",
  DROP COLUMN IF EXISTS "province";
