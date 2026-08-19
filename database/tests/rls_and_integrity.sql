\set ON_ERROR_STOP on
BEGIN;

-- Synthetic fixed IDs for repeatable rollback-only smoke tests.
INSERT INTO agencies(id, name) VALUES
  ('11111111-1111-4111-8111-111111111111', 'Test Agency A'),
  ('22222222-2222-4222-8222-222222222222', 'Test Agency B');
INSERT INTO users(id, agency_id, email, display_name, role) VALUES
  ('11111111-1111-4111-8111-111111111112','11111111-1111-4111-8111-111111111111','a@test.invalid','Clinician A','clinician_rn'),
  ('22222222-2222-4222-8222-222222222223','22222222-2222-4222-8222-222222222222','b@test.invalid','Clinician B','clinician_rn'),
  ('11111111-1111-4111-8111-111111111150','11111111-1111-4111-8111-111111111111','qa@test.invalid','QA Reviewer','qa_reviewer');
INSERT INTO patients(id, agency_id, mrn, first_name, last_name) VALUES
  ('11111111-1111-4111-8111-111111111113','11111111-1111-4111-8111-111111111111','A-1','Alpha','Patient'),
  ('22222222-2222-4222-8222-222222222224','22222222-2222-4222-8222-222222222222','B-1','Beta','Patient');
INSERT INTO episodes(id, agency_id, patient_id, start_date) VALUES
  ('11111111-1111-4111-8111-111111111114','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111113',CURRENT_DATE);
INSERT INTO visits(id, agency_id, patient_id, episode_id, clinician_id, scheduled_at, discipline, visit_type) VALUES
  ('11111111-1111-4111-8111-111111111115','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111113','11111111-1111-4111-8111-111111111114','11111111-1111-4111-8111-111111111112',now(),'RN','Test');
INSERT INTO visits(id, agency_id, patient_id, episode_id, clinician_id, scheduled_at, discipline, visit_type) VALUES
  ('11111111-1111-4111-8111-111111111120','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111113','11111111-1111-4111-8111-111111111114','11111111-1111-4111-8111-111111111112',now() + interval '1 day','RN','Second Test');

-- A UUID-only FK would allow this cross-tenant clinician link; the tenant-qualified
-- composite FK must reject it even for the migration superuser (which bypasses RLS).
DO $$
BEGIN
  BEGIN
    INSERT INTO visits(id, agency_id, patient_id, clinician_id, scheduled_at, discipline, visit_type)
      VALUES ('33333333-3333-4333-8333-333333333334','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111113','22222222-2222-4222-8222-222222222223',now(),'RN','Illegal cross tenant');
    RAISE EXCEPTION 'Expected tenant-qualified clinician FK to fail';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
END $$;
INSERT INTO clinical_notes(id, agency_id, patient_id, visit_id, author_id, client_generated_id, narrative) VALUES
  ('11111111-1111-4111-8111-111111111116','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111113','11111111-1111-4111-8111-111111111115','11111111-1111-4111-8111-111111111112','11111111-1111-4111-8111-111111111117','draft');

SET LOCAL ROLE homehealth_app;
SELECT set_config('app.current_agency_id','11111111-1111-4111-8111-111111111111',true);
SELECT set_config('app.current_user_id','11111111-1111-4111-8111-111111111112',true);

DO $$
DECLARE c integer;
BEGIN
  SELECT count(*) INTO c FROM patients;
  IF c <> 1 THEN RAISE EXCEPTION 'RLS failure: agency A saw % patient rows', c; END IF;
  SELECT count(*) INTO c FROM agencies;
  IF c <> 1 THEN RAISE EXCEPTION 'RLS failure: agency A saw % agency rows', c; END IF;
END $$;

DO $$
BEGIN
  BEGIN
    INSERT INTO patients(id, agency_id, mrn, first_name, last_name)
      VALUES ('33333333-3333-4333-8333-333333333333','22222222-2222-4222-8222-222222222222','ILLEGAL','Cross','Tenant');
    RAISE EXCEPTION 'Expected cross-tenant patient insert to fail';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

-- Finalize through the atomic signing function, then verify content cannot be updated or deleted.
UPDATE clinical_notes SET narrative='Skilled assessment and interventions documented for test.', interventions='Skilled assessment completed.', response_to_care='Tolerated.', next_visit_plan='Reassess next visit.', patient_identity_confirmed=true, medications_reviewed=true, orders_reviewed=true, plan_of_care_reviewed=true, prior_context_reviewed=true WHERE id='11111111-1111-4111-8111-111111111116';
SELECT finalize_clinical_note('11111111-1111-4111-8111-111111111116','11111111-1111-4111-8111-111111111112','I attest this note is complete and accurate.');
DO $$
DECLARE update_blocked boolean := false; delete_blocked boolean := false;
BEGIN
  BEGIN
    UPDATE clinical_notes SET narrative='rewritten' WHERE id='11111111-1111-4111-8111-111111111116';
  EXCEPTION WHEN raise_exception THEN update_blocked := true;
  END;
  IF NOT update_blocked THEN RAISE EXCEPTION 'Expected finalized note update to fail'; END IF;

  BEGIN
    DELETE FROM clinical_notes WHERE id='11111111-1111-4111-8111-111111111116';
  EXCEPTION WHEN raise_exception THEN delete_blocked := true;
  END;
  IF NOT delete_blocked THEN RAISE EXCEPTION 'Expected finalized note delete to fail'; END IF;
END $$;

-- A valid amendment draft may point to the finalized note for the same visit.
INSERT INTO clinical_notes(id, agency_id, patient_id, visit_id, author_id, client_generated_id, narrative, amends_note_id)
VALUES ('11111111-1111-4111-8111-111111111121','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111113','11111111-1111-4111-8111-111111111115','11111111-1111-4111-8111-111111111112','11111111-1111-4111-8111-111111111122','correction draft','11111111-1111-4111-8111-111111111116');
UPDATE clinical_notes SET narrative='Correction draft with adequate detail.', interventions='Corrected skilled intervention.', response_to_care='Tolerated.', next_visit_plan='Continue plan.', patient_identity_confirmed=true, medications_reviewed=true, orders_reviewed=true, plan_of_care_reviewed=true, prior_context_reviewed=true WHERE id='11111111-1111-4111-8111-111111111121';
SELECT finalize_clinical_note('11111111-1111-4111-8111-111111111121','11111111-1111-4111-8111-111111111112','I attest this amendment is complete and accurate.');

-- A target from another visit is clinically unrelated even if patient/tenant match.
DO $$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    INSERT INTO clinical_notes(id, agency_id, patient_id, visit_id, author_id, client_generated_id, narrative, amends_note_id)
    VALUES ('11111111-1111-4111-8111-111111111123','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111113','11111111-1111-4111-8111-111111111120','11111111-1111-4111-8111-111111111112','11111111-1111-4111-8111-111111111124','wrong visit','11111111-1111-4111-8111-111111111116');
  EXCEPTION WHEN raise_exception THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'Expected unrelated amendment target to fail'; END IF;
END $$;

-- Newer EVV event must remain authoritative if an older offline event syncs later.
INSERT INTO evv_events(id, agency_id, visit_id, clinician_id, event_type, captured_at, latitude, longitude, accuracy_meters, source)
VALUES ('11111111-1111-4111-8111-111111111118','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111115','11111111-1111-4111-8111-111111111112','check-in','2026-08-18T10:00:00Z',36.16,-82.83,8,'device');
INSERT INTO evv_events(id, agency_id, visit_id, clinician_id, event_type, captured_at, latitude, longitude, accuracy_meters, source)
VALUES ('11111111-1111-4111-8111-111111111119','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111115','11111111-1111-4111-8111-111111111112','check-in','2026-08-18T09:55:00Z',36.15,-82.82,12,'device');
DO $$
DECLARE t timestamptz;
BEGIN
  SELECT check_in_at INTO t FROM visits WHERE id='11111111-1111-4111-8111-111111111115';
  IF t <> '2026-08-18T10:00:00Z'::timestamptz THEN RAISE EXCEPTION 'EVV ordering failure: %', t; END IF;
END $$;

-- A check-out captured before the latest check-in is an impossible visit sequence.
DO $$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    INSERT INTO evv_events(id, agency_id, visit_id, clinician_id, event_type, captured_at, latitude, longitude, accuracy_meters, source)
    VALUES ('11111111-1111-4111-8111-111111111140','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111115','11111111-1111-4111-8111-111111111112','check-out','2026-08-18T09:00:00Z',36.16,-82.83,8,'device');
  EXCEPTION WHEN raise_exception THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'Expected reversed EVV check-out to fail'; END IF;
END $$;

-- Normal check-out succeeds. A later-captured check-in is rejected, while an older
-- offline check-in may still sync after check-out without replacing the authoritative time.
INSERT INTO evv_events(id, agency_id, visit_id, clinician_id, event_type, captured_at, latitude, longitude, accuracy_meters, source)
VALUES ('11111111-1111-4111-8111-111111111141','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111115','11111111-1111-4111-8111-111111111112','check-out','2026-08-18T11:00:00Z',36.16,-82.83,8,'device');
DO $$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    INSERT INTO evv_events(id, agency_id, visit_id, clinician_id, event_type, captured_at, latitude, longitude, accuracy_meters, source)
    VALUES ('11111111-1111-4111-8111-111111111142','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111115','11111111-1111-4111-8111-111111111112','check-in','2026-08-18T12:00:00Z',36.16,-82.83,8,'device');
  EXCEPTION WHEN raise_exception THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'Expected post-check-out check-in to fail'; END IF;
END $$;
INSERT INTO evv_events(id, agency_id, visit_id, clinician_id, event_type, captured_at, latitude, longitude, accuracy_meters, source)
VALUES ('11111111-1111-4111-8111-111111111143','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111115','11111111-1111-4111-8111-111111111112','check-in','2026-08-18T09:50:00Z',36.15,-82.82,12,'device');
DO $$
DECLARE t timestamptz;
BEGIN
  SELECT check_in_at INTO t FROM visits WHERE id='11111111-1111-4111-8111-111111111115';
  IF t <> '2026-08-18T10:00:00Z'::timestamptz THEN RAISE EXCEPTION 'Older offline EVV event replaced latest check-in: %', t; END IF;
END $$;

-- Allergy semantics must distinguish an actually reviewed NKDA chart from an
-- unreviewed/empty allergy list. 'known' cannot be saved without at least one allergy.
DO $$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    UPDATE patients SET allergy_status='known', allergies='[]'::jsonb WHERE id='11111111-1111-4111-8111-111111111113';
  EXCEPTION WHEN check_violation THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'Expected known allergy state with empty list to fail'; END IF;
END $$;
UPDATE patients SET allergy_status='nkda', allergies='[]'::jsonb WHERE id='11111111-1111-4111-8111-111111111113';
UPDATE patients SET allergy_status='known', allergies='["Penicillin"]'::jsonb WHERE id='11111111-1111-4111-8111-111111111113';

-- Runtime SQL cannot alter the EVV convenience columns directly. Only an append-only
-- evv_events INSERT may update them through the security-definer trigger.
DO $$
BEGIN
  BEGIN
    UPDATE visits SET check_in_at = now() WHERE id='11111111-1111-4111-8111-111111111115';
    RAISE EXCEPTION 'Expected direct EVV convenience-column update to fail';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO visits(id, agency_id, patient_id, clinician_id, scheduled_at, discipline, visit_type, check_in_at)
      VALUES ('11111111-1111-4111-8111-111111111130','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111113','11111111-1111-4111-8111-111111111112',now(),'RN','Illegal EVV direct write',now());
    RAISE EXCEPTION 'Expected direct EVV convenience-column insert to fail';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

-- The normal runtime role cannot physically erase a visit; cancellation/missed state
-- is represented by the status field instead.
DO $$
BEGIN
  BEGIN
    DELETE FROM visits WHERE id='11111111-1111-4111-8111-111111111120';
    RAISE EXCEPTION 'Expected visit delete to fail';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

-- EVV facts themselves are append-only to the runtime role.
DO $$
BEGIN
  BEGIN
    UPDATE evv_events SET latitude=36.20 WHERE id='11111111-1111-4111-8111-111111111118';
    RAISE EXCEPTION 'Expected EVV event update to fail';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    DELETE FROM evv_events WHERE id='11111111-1111-4111-8111-111111111118';
    RAISE EXCEPTION 'Expected EVV event delete to fail';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

-- Workflow definitions are versioned. Runtime code may retire/activate a version but
-- cannot delete or rewrite its historical definition.
INSERT INTO workflow_profiles(id, agency_id, name, version, steps, created_by)
VALUES ('11111111-1111-4111-8111-111111111131','11111111-1111-4111-8111-111111111111','Test Workflow',1,'["patient-review","assessment","review-sign"]'::jsonb,'11111111-1111-4111-8111-111111111112');
UPDATE workflow_profiles SET retired_at=now() WHERE id='11111111-1111-4111-8111-111111111131';
DO $$
DECLARE rewrite_blocked boolean := false;
BEGIN
  BEGIN
    UPDATE workflow_profiles SET steps='["assessment"]'::jsonb WHERE id='11111111-1111-4111-8111-111111111131';
  EXCEPTION WHEN raise_exception THEN rewrite_blocked := true;
  END;
  IF NOT rewrite_blocked THEN RAISE EXCEPTION 'Expected workflow definition rewrite to fail'; END IF;

  BEGIN
    DELETE FROM workflow_profiles WHERE id='11111111-1111-4111-8111-111111111131';
    RAISE EXCEPTION 'Expected workflow profile delete to fail';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;



-- Clinical context tables are tenant-isolated and medication records can be reconciled
-- without mutating the finalized visit note.
INSERT INTO medications(id, agency_id, patient_id, name, status, high_risk)
VALUES ('11111111-1111-4111-8111-111111111151','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111113','Test Medication','active',true);
DO $$
DECLARE c integer;
BEGIN
  SELECT count(*) INTO c FROM medications;
  IF c <> 1 THEN RAISE EXCEPTION 'Clinical-context RLS failure: saw % medications', c; END IF;
END $$;

-- Ordinary clinicians cannot masquerade as QA reviewers at the database layer.
DO $$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    INSERT INTO qa_reviews(agency_id,note_id,reviewer_id,status)
    VALUES ('11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111116','11111111-1111-4111-8111-111111111112','approved');
  EXCEPTION WHEN raise_exception THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'Expected non-QA reviewer to be rejected'; END IF;
END $$;
INSERT INTO qa_reviews(agency_id,note_id,reviewer_id,status)
VALUES ('11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111116','11111111-1111-4111-8111-111111111150','approved');

-- Signature evidence created by finalize_clinical_note is append-only.
DO $$
DECLARE c integer; blocked boolean := false;
BEGIN
  SELECT count(*) INTO c FROM signature_attestations WHERE note_id='11111111-1111-4111-8111-111111111116';
  IF c <> 1 THEN RAISE EXCEPTION 'Expected one atomic signature attestation, found %', c; END IF;
  BEGIN
    UPDATE signature_attestations SET attestation_text='changed' WHERE note_id='11111111-1111-4111-8111-111111111116';
  EXCEPTION WHEN raise_exception THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'Expected signature evidence update to fail'; END IF;
END $$;

RESET ROLE;
ROLLBACK;
\echo 'RLS/integrity smoke tests passed.'
