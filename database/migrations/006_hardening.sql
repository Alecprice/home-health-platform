-- Security/integrity hardening discovered during the v0.4 stress-test pass.

-- The original planning glossary includes medical social work as a clinical discipline.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'clinician_msw';

-- Tenant-visible agency row is also protected by RLS.
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE agencies FORCE ROW LEVEL SECURITY;
CREATE POLICY agencies_tenant_isolation ON agencies
  USING (id = nullif(current_setting('app.current_agency_id', true), '')::uuid);

-- Audit rows are tenant-scoped just like clinical data.
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;
CREATE POLICY audit_log_tenant_isolation ON audit_log
  USING (agency_id = nullif(current_setting('app.current_agency_id', true), '')::uuid)
  WITH CHECK (agency_id = nullif(current_setting('app.current_agency_id', true), '')::uuid);

-- Basic domain constraints that stop impossible/corrupt data at the DB boundary.
ALTER TABLE episodes ADD CONSTRAINT episodes_date_order_chk CHECK (end_date IS NULL OR end_date >= start_date);
ALTER TABLE visits ADD COLUMN status text NOT NULL DEFAULT 'scheduled';
ALTER TABLE visits ADD CONSTRAINT visits_status_chk CHECK (status IN ('scheduled','in-progress','completed','cancelled','missed'));
ALTER TABLE extracted_fields ADD CONSTRAINT extracted_fields_confidence_chk CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1));
ALTER TABLE extracted_fields ADD CONSTRAINT extracted_fields_review_status_chk CHECK (review_status IN ('proposed','accepted','rejected','corrected'));
ALTER TABLE source_documents ADD CONSTRAINT source_documents_processing_status_chk CHECK (processing_status IN ('pending','processing','completed','failed'));
ALTER TABLE workflow_profiles ADD CONSTRAINT workflow_profiles_steps_array_chk CHECK (jsonb_typeof(steps) = 'array');
ALTER TABLE workflow_profiles ADD CONSTRAINT workflow_profiles_active_not_retired_chk CHECK (NOT is_active OR retired_at IS NULL);
ALTER TABLE mileage_logs ADD CONSTRAINT mileage_odometer_pair_chk CHECK ((start_odometer IS NULL) = (end_odometer IS NULL));
ALTER TABLE mileage_logs ADD CONSTRAINT mileage_odometer_order_chk CHECK (start_odometer IS NULL OR end_odometer >= start_odometer);
ALTER TABLE mileage_logs DROP CONSTRAINT mileage_logs_miles_check;
ALTER TABLE mileage_logs ADD CONSTRAINT mileage_positive_finite_chk CHECK (miles > 0 AND miles <= 100000);
ALTER TABLE mileage_logs ADD CONSTRAINT mileage_odometer_finite_chk CHECK ((start_odometer IS NULL OR (start_odometer >= 0 AND start_odometer < 'Infinity'::numeric)) AND (end_odometer IS NULL OR (end_odometer >= 0 AND end_odometer < 'Infinity'::numeric)));
ALTER TABLE mileage_logs ADD CONSTRAINT mileage_odometer_matches_miles_chk CHECK (start_odometer IS NULL OR miles = round(end_odometer - start_odometer, 1));
ALTER TABLE field_expenses ADD CONSTRAINT expense_finite_chk CHECK (amount <= 99999999.99);

-- Amendments are separate records. The original signed row never changes.
ALTER TABLE clinical_notes ADD COLUMN amends_note_id uuid REFERENCES clinical_notes(id);
ALTER TABLE clinical_notes ADD CONSTRAINT clinical_notes_signed_at_chk CHECK (
  (status = 'draft' AND signed_at IS NULL)
  OR (status IN ('signed','locked','amended') AND signed_at IS NOT NULL)
);
ALTER TABLE clinical_notes ADD CONSTRAINT clinical_notes_amendment_target_chk CHECK (status <> 'amended' OR amends_note_id IS NOT NULL);
ALTER TABLE clinical_notes ADD CONSTRAINT clinical_notes_amendment_status_chk CHECK (amends_note_id IS NULL OR status IN ('draft','amended'));
ALTER TABLE clinical_notes ADD CONSTRAINT clinical_notes_no_self_amend_chk CHECK (amends_note_id IS NULL OR amends_note_id <> id);

-- Parent rows expose a tenant-qualified unique key so child relationships cannot point across agencies.
ALTER TABLE users ADD CONSTRAINT users_agency_id_id_uniq UNIQUE (agency_id, id);
ALTER TABLE patients ADD CONSTRAINT patients_agency_id_id_uniq UNIQUE (agency_id, id);
ALTER TABLE episodes ADD CONSTRAINT episodes_agency_id_id_uniq UNIQUE (agency_id, id);
ALTER TABLE visits ADD CONSTRAINT visits_agency_id_id_uniq UNIQUE (agency_id, id);
ALTER TABLE clinical_notes ADD CONSTRAINT clinical_notes_agency_id_id_uniq UNIQUE (agency_id, id);
ALTER TABLE source_documents ADD CONSTRAINT source_documents_agency_id_id_uniq UNIQUE (agency_id, id);
ALTER TABLE audit_log ADD CONSTRAINT audit_log_user_requires_agency_chk CHECK (user_id IS NULL OR agency_id IS NOT NULL);
ALTER TABLE audit_log ADD CONSTRAINT audit_log_user_tenant_fk FOREIGN KEY (agency_id, user_id) REFERENCES users(agency_id, id);

ALTER TABLE episodes ADD CONSTRAINT episodes_patient_tenant_fk FOREIGN KEY (agency_id, patient_id) REFERENCES patients(agency_id, id);
ALTER TABLE visits ADD CONSTRAINT visits_patient_tenant_fk FOREIGN KEY (agency_id, patient_id) REFERENCES patients(agency_id, id);
ALTER TABLE visits ADD CONSTRAINT visits_episode_tenant_fk FOREIGN KEY (agency_id, episode_id) REFERENCES episodes(agency_id, id);
ALTER TABLE visits ADD CONSTRAINT visits_clinician_tenant_fk FOREIGN KEY (agency_id, clinician_id) REFERENCES users(agency_id, id);
ALTER TABLE clinical_notes ADD CONSTRAINT clinical_notes_patient_tenant_fk FOREIGN KEY (agency_id, patient_id) REFERENCES patients(agency_id, id);
ALTER TABLE clinical_notes ADD CONSTRAINT clinical_notes_visit_tenant_fk FOREIGN KEY (agency_id, visit_id) REFERENCES visits(agency_id, id);
ALTER TABLE clinical_notes ADD CONSTRAINT clinical_notes_author_tenant_fk FOREIGN KEY (agency_id, author_id) REFERENCES users(agency_id, id);
ALTER TABLE clinical_notes ADD CONSTRAINT clinical_notes_amends_tenant_fk FOREIGN KEY (agency_id, amends_note_id) REFERENCES clinical_notes(agency_id, id);
ALTER TABLE source_documents ADD CONSTRAINT source_documents_patient_tenant_fk FOREIGN KEY (agency_id, patient_id) REFERENCES patients(agency_id, id);
ALTER TABLE source_documents ADD CONSTRAINT source_documents_uploader_tenant_fk FOREIGN KEY (agency_id, uploaded_by) REFERENCES users(agency_id, id);
ALTER TABLE extracted_fields ADD CONSTRAINT extracted_fields_document_tenant_fk FOREIGN KEY (agency_id, source_document_id) REFERENCES source_documents(agency_id, id);
ALTER TABLE extracted_fields ADD CONSTRAINT extracted_fields_patient_tenant_fk FOREIGN KEY (agency_id, patient_id) REFERENCES patients(agency_id, id);
ALTER TABLE extracted_fields ADD CONSTRAINT extracted_fields_reviewer_tenant_fk FOREIGN KEY (agency_id, reviewed_by) REFERENCES users(agency_id, id);
ALTER TABLE mileage_logs ADD CONSTRAINT mileage_user_tenant_fk FOREIGN KEY (agency_id, user_id) REFERENCES users(agency_id, id);
ALTER TABLE mileage_logs ADD CONSTRAINT mileage_visit_tenant_fk FOREIGN KEY (agency_id, visit_id) REFERENCES visits(agency_id, id);
ALTER TABLE mileage_logs ADD CONSTRAINT mileage_patient_tenant_fk FOREIGN KEY (agency_id, patient_id) REFERENCES patients(agency_id, id);
ALTER TABLE field_expenses ADD CONSTRAINT expenses_user_tenant_fk FOREIGN KEY (agency_id, user_id) REFERENCES users(agency_id, id);
ALTER TABLE field_expenses ADD CONSTRAINT expenses_visit_tenant_fk FOREIGN KEY (agency_id, visit_id) REFERENCES visits(agency_id, id);
ALTER TABLE field_expenses ADD CONSTRAINT expenses_patient_tenant_fk FOREIGN KEY (agency_id, patient_id) REFERENCES patients(agency_id, id);
ALTER TABLE field_expenses ADD CONSTRAINT expenses_receipt_tenant_fk FOREIGN KEY (agency_id, receipt_document_id) REFERENCES source_documents(agency_id, id);
ALTER TABLE workflow_profiles ADD CONSTRAINT workflow_created_by_tenant_fk FOREIGN KEY (agency_id, created_by) REFERENCES users(agency_id, id);
ALTER TABLE evv_events ADD CONSTRAINT evv_visit_tenant_fk FOREIGN KEY (agency_id, visit_id) REFERENCES visits(agency_id, id);
ALTER TABLE evv_events ADD CONSTRAINT evv_clinician_tenant_fk FOREIGN KEY (agency_id, clinician_id) REFERENCES users(agency_id, id);

-- If a redundant patient_id is stored alongside visit_id, enforce that they refer to the same patient.
CREATE OR REPLACE FUNCTION assert_visit_patient_pair() RETURNS trigger AS $$
BEGIN
  IF NEW.visit_id IS NOT NULL AND NEW.patient_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM visits v
    WHERE v.id = NEW.visit_id AND v.agency_id = NEW.agency_id AND v.patient_id = NEW.patient_id
  ) THEN
    RAISE EXCEPTION 'visit_id and patient_id do not refer to the same tenant patient';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clinical_notes_visit_patient_match BEFORE INSERT OR UPDATE ON clinical_notes FOR EACH ROW EXECUTE FUNCTION assert_visit_patient_pair();
CREATE TRIGGER mileage_visit_patient_match BEFORE INSERT OR UPDATE ON mileage_logs FOR EACH ROW EXECUTE FUNCTION assert_visit_patient_pair();
CREATE TRIGGER expenses_visit_patient_match BEFORE INSERT OR UPDATE ON field_expenses FOR EACH ROW EXECUTE FUNCTION assert_visit_patient_pair();

CREATE OR REPLACE FUNCTION assert_visit_episode_patient_pair() RETURNS trigger AS $$
BEGIN
  IF NEW.episode_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM episodes e
    WHERE e.id = NEW.episode_id AND e.agency_id = NEW.agency_id AND e.patient_id = NEW.patient_id
  ) THEN
    RAISE EXCEPTION 'episode_id does not belong to the visit patient';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER visits_episode_patient_match BEFORE INSERT OR UPDATE ON visits FOR EACH ROW EXECUTE FUNCTION assert_visit_episode_patient_pair();

-- An amendment may be drafted before it is finalized, but its target must already be
-- a finalized note for the same tenant/patient/visit. This prevents valid UUIDs from
-- linking clinically unrelated records.
CREATE OR REPLACE FUNCTION assert_amendment_target() RETURNS trigger AS $$
BEGIN
  IF NEW.amends_note_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM clinical_notes n
    WHERE n.id = NEW.amends_note_id
      AND n.agency_id = NEW.agency_id
      AND n.patient_id = NEW.patient_id
      AND n.visit_id = NEW.visit_id
      AND n.status IN ('signed','locked','amended')
  ) THEN
    RAISE EXCEPTION 'amends_note_id must reference a finalized note for the same tenant, patient, and visit';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER clinical_notes_amendment_target_match
BEFORE INSERT OR UPDATE ON clinical_notes
FOR EACH ROW EXECUTE FUNCTION assert_amendment_target();

-- Signed/locked/amendment records cannot be updated OR deleted. Corrections are new rows linked by amends_note_id.
CREATE OR REPLACE FUNCTION prevent_signed_note_edit() RETURNS trigger AS $$
BEGIN
  IF OLD.status IN ('signed','locked','amended') THEN
    RAISE EXCEPTION 'Finalized clinical notes are immutable; create a separate amendment record.';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER clinical_notes_immutable ON clinical_notes;
CREATE TRIGGER clinical_notes_immutable
BEFORE UPDATE OR DELETE ON clinical_notes
FOR EACH ROW EXECUTE FUNCTION prevent_signed_note_edit();

CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER clinical_notes_touch_updated_at BEFORE UPDATE ON clinical_notes FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER mileage_logs_touch_updated_at BEFORE UPDATE ON mileage_logs FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER field_expenses_touch_updated_at BEFORE UPDATE ON field_expenses FOR EACH ROW EXECUTE FUNCTION touch_updated_at();


-- Workflow definitions are versioned records. Allow activation/retirement state to change,
-- but never rewrite the historical definition of an existing version in place.
CREATE OR REPLACE FUNCTION prevent_workflow_definition_rewrite() RETURNS trigger AS $$
BEGIN
  IF OLD.agency_id IS DISTINCT FROM NEW.agency_id
     OR OLD.name IS DISTINCT FROM NEW.name
     OR OLD.version IS DISTINCT FROM NEW.version
     OR OLD.steps IS DISTINCT FROM NEW.steps
     OR OLD.created_by IS DISTINCT FROM NEW.created_by
     OR OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION 'Workflow profile definitions are immutable; create a new version instead.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER workflow_profiles_definition_immutable
BEFORE UPDATE ON workflow_profiles
FOR EACH ROW EXECUTE FUNCTION prevent_workflow_definition_rewrite();

-- The runtime role is intentionally non-superuser so FORCE RLS is meaningful in local tests.
-- Use EXECUTE for privilege utility statements inside PL/pgSQL and explicitly prevent
-- the app role from creating objects in public.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'homehealth_app') THEN
    EXECUTE 'GRANT CONNECT ON DATABASE ' || quote_ident(current_database()) || ' TO homehealth_app';
    EXECUTE 'GRANT USAGE ON SCHEMA public TO homehealth_app';
    EXECUTE 'REVOKE CREATE ON SCHEMA public FROM homehealth_app';
    EXECUTE 'GRANT SELECT ON agencies TO homehealth_app';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON users, patients, episodes, clinical_notes, source_documents, extracted_fields, mileage_logs, field_expenses, workflow_profiles TO homehealth_app';
    EXECUTE 'GRANT SELECT ON visits TO homehealth_app';
    EXECUTE 'REVOKE DELETE ON visits FROM homehealth_app';
    EXECUTE 'GRANT INSERT (id, agency_id, patient_id, episode_id, clinician_id, scheduled_at, discipline, visit_type, status) ON visits TO homehealth_app';
    EXECUTE 'GRANT UPDATE (patient_id, episode_id, clinician_id, scheduled_at, discipline, visit_type, status) ON visits TO homehealth_app';
    EXECUTE 'GRANT SELECT, INSERT ON audit_log, evv_events TO homehealth_app';
    EXECUTE 'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO homehealth_app';
    EXECUTE 'REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM homehealth_app';
    EXECUTE 'REVOKE UPDATE, DELETE, TRUNCATE ON evv_events FROM homehealth_app';
    EXECUTE 'REVOKE DELETE ON workflow_profiles FROM homehealth_app';
  END IF;
END $$;

-- Do not claim a GPS provider when the Capacitor API only tells us it is a device location fix.
ALTER TABLE evv_events DROP CONSTRAINT evv_events_source_check;
ALTER TABLE evv_events ADD CONSTRAINT evv_events_source_check CHECK (source IN ('device','web'));

-- Offline events may arrive out of order. An older capture must never overwrite a newer convenience value on visits.
CREATE OR REPLACE FUNCTION apply_evv_event_to_visit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.event_type = 'check-in' THEN
    UPDATE visits
      SET check_in_at = NEW.captured_at, check_in_lat = NEW.latitude, check_in_lon = NEW.longitude
      WHERE id = NEW.visit_id AND agency_id = NEW.agency_id
        AND (check_in_at IS NULL OR NEW.captured_at >= check_in_at);
  ELSE
    UPDATE visits
      SET check_out_at = NEW.captured_at, check_out_lat = NEW.latitude, check_out_lon = NEW.longitude
      WHERE id = NEW.visit_id AND agency_id = NEW.agency_id
        AND (check_out_at IS NULL OR NEW.captured_at >= check_out_at);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION apply_evv_event_to_visit() FROM PUBLIC;
