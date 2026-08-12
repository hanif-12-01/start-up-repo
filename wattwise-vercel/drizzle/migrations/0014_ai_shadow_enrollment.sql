CREATE TABLE ai_shadow_enrollment (
  business_id text PRIMARY KEY REFERENCES business(id) ON DELETE CASCADE,
  shadow_enabled boolean NOT NULL DEFAULT false,
  approved_provenance text NOT NULL,
  enrolled_at timestamptz,
  disabled_at timestamptz,
  enrollment_reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_shadow_enrollment_provenance_check
    CHECK (approved_provenance = 'REAL_WATTWISE'),
  CONSTRAINT ai_shadow_enrollment_reason_check
    CHECK (length(trim(enrollment_reason)) BETWEEN 3 AND 500),
  CONSTRAINT ai_shadow_enrollment_state_check
    CHECK (
      (shadow_enabled = true AND enrolled_at IS NOT NULL AND disabled_at IS NULL)
      OR shadow_enabled = false
    )
);

CREATE INDEX ai_shadow_enrollment_enabled_idx
ON ai_shadow_enrollment(shadow_enabled, approved_provenance);

-- No business is enrolled or reclassified by this migration.
