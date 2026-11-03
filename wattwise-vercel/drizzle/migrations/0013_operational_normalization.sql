-- Additive operational data and usage normalization foundation.
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE operational_process (
  id text PRIMARY KEY,
  business_id text NOT NULL REFERENCES business(id) ON DELETE CASCADE,
  name text NOT NULL,
  output_unit text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT operational_process_business_id_unique UNIQUE (business_id, id),
  CONSTRAINT operational_process_business_name_unique UNIQUE (business_id, name),
  CONSTRAINT operational_process_name_check CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  CONSTRAINT operational_process_unit_check CHECK (char_length(btrim(output_unit)) BETWEEN 1 AND 30),
  CONSTRAINT operational_process_description_check CHECK (description IS NULL OR char_length(description) <= 1000)
);
CREATE INDEX operational_process_business_active_idx ON operational_process (business_id, is_active);

CREATE TABLE production_record (
  id text PRIMARY KEY,
  business_id text NOT NULL REFERENCES business(id) ON DELETE CASCADE,
  operational_process_id text NOT NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  output_quantity numeric NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT production_record_process_fk FOREIGN KEY (business_id, operational_process_id)
    REFERENCES operational_process (business_id, id) ON DELETE CASCADE,
  CONSTRAINT production_record_period_unique UNIQUE (business_id, operational_process_id, period_start, period_end),
  CONSTRAINT production_record_period_check CHECK (
    isfinite(period_start) AND isfinite(period_end) AND period_end > period_start
    AND period_start >= '0001-01-01T00:00:00Z'::timestamptz
    AND period_end < '10000-01-01T00:00:00Z'::timestamptz
    AND date_trunc('milliseconds', period_start) = period_start
    AND date_trunc('milliseconds', period_end) = period_end),
  CONSTRAINT production_record_quantity_check CHECK (output_quantity >= 0 AND output_quantity <= 999999999999.999 AND scale(output_quantity) <= 3),
  CONSTRAINT production_record_notes_check CHECK (notes IS NULL OR char_length(notes) <= 1000),
  CONSTRAINT production_record_no_overlap EXCLUDE USING gist (
    business_id WITH =, operational_process_id WITH =, tstzrange(period_start, period_end, '[)') WITH &&)
);
CREATE INDEX production_record_business_period_idx ON production_record (business_id, operational_process_id, period_start, period_end, id);
