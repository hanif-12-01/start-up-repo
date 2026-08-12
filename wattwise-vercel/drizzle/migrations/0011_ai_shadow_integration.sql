ALTER TABLE business
ADD COLUMN data_provenance text NOT NULL DEFAULT 'UNCLASSIFIED';

ALTER TABLE business
ADD CONSTRAINT business_data_provenance_check
CHECK (data_provenance IN ('UNCLASSIFIED', 'REAL_WATTWISE', 'SYNTHETIC_DEMO'));

CREATE TABLE ai_shadow_forecast (
  id text PRIMARY KEY,
  business_id text NOT NULL REFERENCES business(id) ON DELETE CASCADE,
  request_id text NOT NULL,
  forecast_origin timestamptz NOT NULL,
  target_period text NOT NULL,
  data_provenance text NOT NULL,
  prospective_forecast boolean NOT NULL DEFAULT true,
  history_phase text NOT NULL,
  history_fingerprint text NOT NULL,
  transient_payload jsonb,
  mode text NOT NULL,
  status text NOT NULL,
  deterministic_prediction_kwh numeric(15,3),
  ml_prediction_kwh numeric(15,3),
  ml_model text,
  ml_model_version text,
  artifact_sha256 text,
  feature_schema_sha256 text NOT NULL,
  fallback_reason text,
  inference_latency_ms numeric(15,3),
  actual_kwh numeric(15,3),
  actual_kwh_source text,
  actual_observed_at timestamptz,
  absolute_error_ml numeric(15,3),
  absolute_error_deterministic numeric(15,3),
  scored_at timestamptz,
  claim_token text,
  claimed_at timestamptz,
  attempt_count bigint NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_shadow_forecast_request_unique UNIQUE (request_id),
  CONSTRAINT ai_shadow_forecast_mode_check CHECK (mode IN ('SHADOW', 'LOCAL_EXPERIMENTAL')),
  CONSTRAINT ai_shadow_forecast_provenance_check CHECK (data_provenance IN ('REAL_WATTWISE', 'SYNTHETIC_DEMO')),
  CONSTRAINT ai_shadow_forecast_status_check CHECK (status IN ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FALLBACK', 'NOT_ELIGIBLE', 'FAILED_RETRYABLE', 'FAILED_TERMINAL')),
  CONSTRAINT ai_shadow_forecast_phase_check CHECK (history_phase IN ('H00', 'H01_02', 'H03_05', 'H06_12', 'H13_PLUS')),
  CONSTRAINT ai_shadow_forecast_actual_source_check CHECK (actual_kwh_source IS NULL OR actual_kwh_source IN ('USER_ENTERED', 'METER_DERIVED', 'LEGACY_UNKNOWN'))
);

CREATE INDEX ai_shadow_forecast_claim_idx
ON ai_shadow_forecast(status, next_attempt_at, created_at);

CREATE INDEX ai_shadow_forecast_business_target_idx
ON ai_shadow_forecast(business_id, target_period);

CREATE INDEX ai_shadow_forecast_real_evidence_idx
ON ai_shadow_forecast(data_provenance, prospective_forecast, scored_at)
WHERE data_provenance = 'REAL_WATTWISE' AND prospective_forecast = true;
