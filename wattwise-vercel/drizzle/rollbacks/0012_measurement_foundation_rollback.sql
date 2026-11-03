-- Refuse data loss. Export/backup and explicit recovery approval required if populated.
DO $$ BEGIN
  LOCK TABLE measurement_source, energy_measurement IN ACCESS EXCLUSIVE MODE;
  IF EXISTS (SELECT 1 FROM energy_measurement) OR EXISTS (SELECT 1 FROM measurement_source) THEN
    RAISE EXCEPTION 'Measurement rollback refused: preserve/export measurement data before rollback';
  END IF;
  DROP TABLE energy_measurement;
  DROP TABLE measurement_source;
END $$;
-- btree_gist may be shared; deliberately retained.
