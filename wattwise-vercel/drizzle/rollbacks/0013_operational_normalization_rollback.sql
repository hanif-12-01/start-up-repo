-- Refuse data loss. Export/backup and explicit recovery approval required if populated.
DO $$ BEGIN
  LOCK TABLE operational_process, production_record IN ACCESS EXCLUSIVE MODE;
  IF EXISTS (SELECT 1 FROM production_record) OR EXISTS (SELECT 1 FROM operational_process) THEN
    RAISE EXCEPTION 'Operational rollback refused: preserve/export operational data before rollback';
  END IF;
  DROP TABLE production_record;
  DROP TABLE operational_process;
END $$;
-- btree_gist may be shared; deliberately retained.
