-- v0.6 clinical-context foundation.
-- These tables keep mutable source-of-truth clinical context separate from finalized visit notes.
-- OASIS storage is versioned/generic so CMS instrument changes do not require a new column per item.

CREATE TABLE medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  name text NOT NULL,
  strength text,
  dose text,
  route text,
  frequency text,
  indication text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','held','discontinued')),
  high_risk boolean NOT NULL DEFAULT false,
  started_on date,
  discontinued_on date,
  last_reconciled_at timestamptz,
  last_reconciled_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, id),
  FOREIGN KEY (agency_id, patient_id) REFERENCES patients(agency_id, id),
  FOREIGN KEY (agency_id, last_reconciled_by) REFERENCES users(agency_id, id)
);

CREATE TABLE plans_of_care (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  episode_id uuid,
  effective_from date NOT NULL,
  effective_to date,
  certifying_provider text,
  frequency_summary text NOT NULL DEFAULT '',
  precautions jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(precautions) = 'array'),
  homebound_reason text,
  skilled_need text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','superseded','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, id),
  FOREIGN KEY (agency_id, patient_id) REFERENCES patients(agency_id, id),
  FOREIGN KEY (agency_id, episode_id) REFERENCES episodes(agency_id, id)
);

CREATE TABLE clinical_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  episode_id uuid,
  ordered_at timestamptz NOT NULL,
  ordered_by text NOT NULL,
  discipline text,
  category text NOT NULL,
  order_text text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','discontinued')),
  requires_follow_up boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, id),
  FOREIGN KEY (agency_id, patient_id) REFERENCES patients(agency_id, id),
  FOREIGN KEY (agency_id, episode_id) REFERENCES episodes(agency_id, id)
);

CREATE TABLE care_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  episode_id uuid,
  discipline text NOT NULL,
  description text NOT NULL,
  target_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','met','not-met','discontinued')),
  progress text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, id),
  FOREIGN KEY (agency_id, patient_id) REFERENCES patients(agency_id, id),
  FOREIGN KEY (agency_id, episode_id) REFERENCES episodes(agency_id, id)
);

CREATE TABLE wound_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  label text NOT NULL,
  location text NOT NULL,
  wound_type text NOT NULL,
  onset_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','healed')),
  treatment_order text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, id),
  FOREIGN KEY (agency_id, patient_id) REFERENCES patients(agency_id, id)
);

CREATE TABLE wound_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  wound_id uuid NOT NULL,
  visit_id uuid,
  measured_at timestamptz NOT NULL,
  length_cm numeric(8,2) CHECK (length_cm IS NULL OR length_cm >= 0),
  width_cm numeric(8,2) CHECK (width_cm IS NULL OR width_cm >= 0),
  depth_cm numeric(8,2) CHECK (depth_cm IS NULL OR depth_cm >= 0),
  drainage text,
  tissue text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, id),
  FOREIGN KEY (agency_id, wound_id) REFERENCES wound_records(agency_id, id),
  FOREIGN KEY (agency_id, visit_id) REFERENCES visits(agency_id, id),
  FOREIGN KEY (agency_id, created_by) REFERENCES users(agency_id, id)
);

CREATE TABLE assessment_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  visit_id uuid,
  episode_id uuid,
  assessment_type text NOT NULL,
  instrument_version text,
  time_point text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','complete','submitted','accepted','rejected')),
  responses jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(responses) = 'object'),
  validation_errors jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(validation_errors) = 'array'),
  completed_by uuid,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, id),
  FOREIGN KEY (agency_id, patient_id) REFERENCES patients(agency_id, id),
  FOREIGN KEY (agency_id, visit_id) REFERENCES visits(agency_id, id),
  FOREIGN KEY (agency_id, episode_id) REFERENCES episodes(agency_id, id),
  FOREIGN KEY (agency_id, completed_by) REFERENCES users(agency_id, id)
);

CREATE TABLE qa_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  note_id uuid NOT NULL,
  reviewer_id uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('submitted','returned','approved')),
  return_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, id),
  FOREIGN KEY (agency_id, note_id) REFERENCES clinical_notes(agency_id, id),
  FOREIGN KEY (agency_id, reviewer_id) REFERENCES users(agency_id, id),
  CHECK (status <> 'returned' OR nullif(btrim(return_reason), '') IS NOT NULL)
);

CREATE TABLE signature_attestations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  note_id uuid NOT NULL,
  signer_id uuid NOT NULL,
  attestation_text text NOT NULL,
  signed_at timestamptz NOT NULL DEFAULT now(),
  content_sha256 text NOT NULL CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
  UNIQUE (agency_id, note_id),
  UNIQUE (agency_id, id),
  FOREIGN KEY (agency_id, note_id) REFERENCES clinical_notes(agency_id, id),
  FOREIGN KEY (agency_id, signer_id) REFERENCES users(agency_id, id)
);

-- Denormalized visit note sections support direct reporting while assessment remains flexible JSON.
ALTER TABLE clinical_notes ADD COLUMN interventions text NOT NULL DEFAULT '';
ALTER TABLE clinical_notes ADD COLUMN education text NOT NULL DEFAULT '';
ALTER TABLE clinical_notes ADD COLUMN response_to_care text NOT NULL DEFAULT '';
ALTER TABLE clinical_notes ADD COLUMN next_visit_plan text NOT NULL DEFAULT '';
ALTER TABLE clinical_notes ADD COLUMN medications_reviewed boolean NOT NULL DEFAULT false;
ALTER TABLE clinical_notes ADD COLUMN orders_reviewed boolean NOT NULL DEFAULT false;
ALTER TABLE clinical_notes ADD COLUMN plan_of_care_reviewed boolean NOT NULL DEFAULT false;
ALTER TABLE clinical_notes ADD COLUMN prior_context_reviewed boolean NOT NULL DEFAULT false;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['medications','plans_of_care','clinical_orders','care_goals','wound_records','wound_measurements','assessment_instances','qa_reviews','signature_attestations']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I USING (agency_id = nullif(current_setting(''app.current_agency_id'', true), '''')::uuid) WITH CHECK (agency_id = nullif(current_setting(''app.current_agency_id'', true), '''')::uuid)',
      t || '_tenant_isolation', t
    );
  END LOOP;
END $$;

CREATE TRIGGER medications_touch_updated_at BEFORE UPDATE ON medications FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER plans_of_care_touch_updated_at BEFORE UPDATE ON plans_of_care FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER clinical_orders_touch_updated_at BEFORE UPDATE ON clinical_orders FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER care_goals_touch_updated_at BEFORE UPDATE ON care_goals FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER wound_records_touch_updated_at BEFORE UPDATE ON wound_records FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER assessment_instances_touch_updated_at BEFORE UPDATE ON assessment_instances FOR EACH ROW EXECUTE FUNCTION touch_updated_at();


CREATE OR REPLACE FUNCTION enforce_qa_reviewer_role() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = NEW.reviewer_id AND u.agency_id = NEW.agency_id
      AND u.active = true AND u.role IN ('qa_reviewer','clinical_manager','agency_admin')
  ) THEN
    RAISE EXCEPTION 'QA review requires an active QA reviewer, clinical manager, or agency admin';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER qa_reviews_reviewer_role BEFORE INSERT ON qa_reviews FOR EACH ROW EXECUTE FUNCTION enforce_qa_reviewer_role();

CREATE OR REPLACE FUNCTION enforce_signature_attestation() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM clinical_notes n
    WHERE n.id = NEW.note_id AND n.agency_id = NEW.agency_id
      AND n.author_id = NEW.signer_id AND n.status IN ('signed','locked','amended')
  ) THEN
    RAISE EXCEPTION 'Signature attestation must be made by the note author for a finalized note';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER signature_attestations_valid BEFORE INSERT ON signature_attestations FOR EACH ROW EXECUTE FUNCTION enforce_signature_attestation();

-- A signature attestation is evidence and is append-only. Corrections require a note amendment.
CREATE TRIGGER signature_attestations_append_only BEFORE UPDATE OR DELETE ON signature_attestations FOR EACH ROW EXECUTE FUNCTION audit_log_append_only();
CREATE TRIGGER qa_reviews_append_only BEFORE UPDATE OR DELETE ON qa_reviews FOR EACH ROW EXECUTE FUNCTION audit_log_append_only();
CREATE TRIGGER wound_measurements_append_only BEFORE UPDATE OR DELETE ON wound_measurements FOR EACH ROW EXECUTE FUNCTION audit_log_append_only();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'homehealth_app') THEN
    GRANT SELECT, INSERT, UPDATE ON medications, plans_of_care, clinical_orders, care_goals, wound_records, assessment_instances TO homehealth_app;
    GRANT SELECT, INSERT ON wound_measurements, qa_reviews, signature_attestations TO homehealth_app;
    REVOKE DELETE ON medications, plans_of_care, clinical_orders, care_goals, wound_records, assessment_instances, wound_measurements, qa_reviews, signature_attestations FROM homehealth_app;
  END IF;
END $$;

-- Signing is a database operation, not a client-side status flip. The runtime role loses
-- broad UPDATE so status/signed_at cannot be changed outside this function.
REVOKE UPDATE ON clinical_notes FROM homehealth_app;
GRANT UPDATE (
  vitals, assessment, narrative, interventions, education, response_to_care, next_visit_plan,
  patient_identity_confirmed, patient_response, patient_response_transcription_acknowledged_at,
  medications_reviewed, orders_reviewed, plan_of_care_reviewed, prior_context_reviewed
) ON clinical_notes TO homehealth_app;

CREATE OR REPLACE FUNCTION finalize_clinical_note(
  p_note_id uuid,
  p_signer_id uuid,
  p_attestation_text text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  n clinical_notes%ROWTYPE;
  v_hash text;
  v_attestation_id uuid := gen_random_uuid();
BEGIN
  IF nullif(btrim(p_attestation_text), '') IS NULL THEN
    RAISE EXCEPTION 'Signing attestation text is required';
  END IF;

  SELECT * INTO n FROM clinical_notes WHERE id = p_note_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Clinical note not found'; END IF;
  IF n.agency_id IS DISTINCT FROM nullif(current_setting('app.current_agency_id', true), '')::uuid THEN
    RAISE EXCEPTION 'Clinical note is outside the current tenant session';
  END IF;
  IF p_signer_id IS DISTINCT FROM nullif(current_setting('app.current_user_id', true), '')::uuid THEN
    RAISE EXCEPTION 'Signer does not match the authenticated database session';
  END IF;
  IF n.status <> 'draft' THEN RAISE EXCEPTION 'Only draft notes can be finalized'; END IF;
  IF n.author_id IS DISTINCT FROM p_signer_id THEN RAISE EXCEPTION 'Only the note author may sign this note'; END IF;
  IF n.patient_identity_confirmed IS NOT TRUE THEN RAISE EXCEPTION 'Patient identity must be confirmed before signing'; END IF;
  IF NOT (n.medications_reviewed AND n.orders_reviewed AND n.plan_of_care_reviewed AND n.prior_context_reviewed) THEN
    RAISE EXCEPTION 'Required clinical context review is incomplete';
  END IF;
  IF char_length(btrim(n.narrative)) < 20 OR char_length(btrim(n.interventions)) < 10 OR char_length(btrim(n.response_to_care)) < 5 OR char_length(btrim(n.next_visit_plan)) < 5 THEN
    RAISE EXCEPTION 'Required clinical documentation is incomplete';
  END IF;

  v_hash := encode(digest(jsonb_build_object(
    'id', n.id, 'agency_id', n.agency_id, 'patient_id', n.patient_id, 'visit_id', n.visit_id,
    'author_id', n.author_id, 'client_generated_id', n.client_generated_id,
    'vitals', n.vitals, 'assessment', n.assessment, 'narrative', n.narrative,
    'interventions', n.interventions, 'education', n.education,
    'response_to_care', n.response_to_care, 'next_visit_plan', n.next_visit_plan,
    'patient_response', n.patient_response,
    'patient_response_transcription_acknowledged_at', n.patient_response_transcription_acknowledged_at,
    'medications_reviewed', n.medications_reviewed, 'orders_reviewed', n.orders_reviewed,
    'plan_of_care_reviewed', n.plan_of_care_reviewed, 'prior_context_reviewed', n.prior_context_reviewed,
    'amends_note_id', n.amends_note_id
  )::text, 'sha256'), 'hex');

  UPDATE clinical_notes
  SET status = CASE WHEN n.amends_note_id IS NULL THEN 'signed'::note_status ELSE 'amended'::note_status END,
      signed_at = now()
  WHERE id = n.id;

  INSERT INTO signature_attestations(id, agency_id, note_id, signer_id, attestation_text, content_sha256)
  VALUES (v_attestation_id, n.agency_id, n.id, p_signer_id, p_attestation_text, v_hash);

  RETURN v_attestation_id;
END;
$$;
REVOKE ALL ON FUNCTION finalize_clinical_note(uuid,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finalize_clinical_note(uuid,uuid,text) TO homehealth_app;

-- New notes are always born as drafts. Prevent INSERT from supplying status/signed_at directly.
REVOKE INSERT ON clinical_notes FROM homehealth_app;
GRANT INSERT (
  id, agency_id, patient_id, visit_id, author_id, client_generated_id,
  vitals, assessment, narrative, amends_note_id,
  patient_identity_confirmed, patient_response, patient_response_transcription_acknowledged_at,
  interventions, education, response_to_care, next_visit_plan,
  medications_reviewed, orders_reviewed, plan_of_care_reviewed, prior_context_reviewed
) ON clinical_notes TO homehealth_app;
