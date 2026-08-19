DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['users','patients','episodes','visits','clinical_notes','source_documents','extracted_fields']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON %I USING (agency_id = nullif(current_setting(''app.current_agency_id'', true), '''')::uuid) WITH CHECK (agency_id = nullif(current_setting(''app.current_agency_id'', true), '''')::uuid)',
      table_name || '_tenant_isolation', table_name
    );
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION prevent_signed_note_edit() RETURNS trigger AS $$
BEGIN
  IF OLD.status IN ('signed','locked') AND NEW.status <> 'amended' THEN
    RAISE EXCEPTION 'Signed clinical notes are immutable; create an amendment instead.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clinical_notes_immutable
BEFORE UPDATE ON clinical_notes
FOR EACH ROW EXECUTE FUNCTION prevent_signed_note_edit();

CREATE OR REPLACE FUNCTION audit_log_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_no_update
BEFORE UPDATE OR DELETE ON audit_log
FOR EACH ROW EXECUTE FUNCTION audit_log_append_only();
