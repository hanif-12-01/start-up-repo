-- Additive only. No billing backfill, no automatic aggregation.
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE measurement_source (
  id text PRIMARY KEY,
  business_id text NOT NULL REFERENCES business(id) ON DELETE CASCADE,
  name text NOT NULL,
  source_type text NOT NULL,
  measurement_boundary text NOT NULL,
  provenance_key text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT measurement_source_business_id_unique UNIQUE (business_id, id),
  CONSTRAINT measurement_source_provenance_unique UNIQUE (business_id, provenance_key),
  CONSTRAINT measurement_source_name_check CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  CONSTRAINT measurement_source_type_check CHECK (source_type IN ('METER','SENSOR','DOCUMENT','USER_ESTIMATE')),
  CONSTRAINT measurement_source_boundary_check CHECK (measurement_boundary IN ('WHOLE_SITE','SUBMETER','UNKNOWN')),
  CONSTRAINT measurement_source_provenance_check CHECK (provenance_key ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$'),
  CONSTRAINT measurement_source_description_check CHECK (description IS NULL OR char_length(description) <= 1000)
);
CREATE INDEX measurement_source_business_active_idx ON measurement_source (business_id, is_active);

CREATE TABLE energy_measurement (
  id text PRIMARY KEY,
  business_id text NOT NULL REFERENCES business(id) ON DELETE CASCADE,
  measurement_source_id text NOT NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  source_timezone text NOT NULL,
  -- No numeric(p,s): PostgreSQL rounds excess fractional precision before CHECK.
  energy_kwh numeric NOT NULL,
  unit text NOT NULL DEFAULT 'kWh',
  measurement_kind text NOT NULL DEFAULT 'INTERVAL_ENERGY',
  measurement_method text NOT NULL,
  consumption_basis text NOT NULL,
  quality_status text NOT NULL,
  provenance_reference text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT energy_measurement_source_fk FOREIGN KEY (business_id, measurement_source_id)
    REFERENCES measurement_source (business_id, id) ON DELETE CASCADE,
  CONSTRAINT energy_measurement_period_unique UNIQUE (business_id, measurement_source_id, period_start, period_end),
  CONSTRAINT energy_measurement_period_check CHECK (
    isfinite(period_start) AND isfinite(period_end) AND period_end > period_start
    AND period_start >= '0001-01-01T00:00:00Z'::timestamptz
    AND period_end < '10000-01-01T00:00:00Z'::timestamptz
    AND date_trunc('milliseconds', period_start) = period_start
    AND date_trunc('milliseconds', period_end) = period_end),
  CONSTRAINT energy_measurement_energy_check CHECK (energy_kwh >= 0 AND energy_kwh <= 999999999999.999 AND scale(energy_kwh) <= 3),
  CONSTRAINT energy_measurement_unit_check CHECK (unit = 'kWh' AND measurement_kind = 'INTERVAL_ENERGY'),
  CONSTRAINT energy_measurement_timezone_check CHECK (source_timezone IN ('UTC','Asia/Jakarta','Asia/Makassar','Asia/Jayapura')),
  CONSTRAINT energy_measurement_method_check CHECK (measurement_method IN ('MANUAL','CSV_IMPORT','SENSOR')),
  CONSTRAINT energy_measurement_basis_check CHECK (consumption_basis IN ('MEASURED','ESTIMATED')),
  CONSTRAINT energy_measurement_quality_check CHECK (quality_status IN ('RECORDED','NEEDS_REVIEW') AND (consumption_basis <> 'ESTIMATED' OR quality_status = 'NEEDS_REVIEW')),
  CONSTRAINT energy_measurement_provenance_check CHECK (char_length(btrim(provenance_reference)) BETWEEN 1 AND 240),
  CONSTRAINT energy_measurement_notes_check CHECK (notes IS NULL OR char_length(notes) <= 1000),
  CONSTRAINT energy_measurement_no_overlap EXCLUDE USING gist (
    business_id WITH =, measurement_source_id WITH =, tstzrange(period_start, period_end, '[)') WITH &&)
);
CREATE INDEX energy_measurement_business_period_idx ON energy_measurement (business_id, period_start, period_end, id);
