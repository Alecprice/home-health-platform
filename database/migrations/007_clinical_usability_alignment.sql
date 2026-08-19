-- Align the persistent schema with patient-safety fields already required by the tablet UI.
-- Added during the v0.5 clinician/cognitive-load usability pass.

ALTER TABLE patients ADD COLUMN phone text;
ALTER TABLE patients ADD COLUMN address text;
ALTER TABLE patients ADD COLUMN allergy_status text NOT NULL DEFAULT 'not-reviewed';
ALTER TABLE patients ADD COLUMN allergies jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE patients ADD CONSTRAINT patients_allergy_status_chk CHECK (allergy_status IN ('known','nkda','not-reviewed'));
ALTER TABLE patients ADD CONSTRAINT patients_allergies_array_chk CHECK (jsonb_typeof(allergies) = 'array');
ALTER TABLE patients ADD CONSTRAINT patients_known_allergy_requires_value_chk CHECK (allergy_status <> 'known' OR jsonb_array_length(allergies) > 0);
ALTER TABLE patients ADD CONSTRAINT patients_nkda_has_empty_list_chk CHECK (allergy_status <> 'nkda' OR jsonb_array_length(allergies) = 0);

ALTER TABLE clinical_notes ADD COLUMN patient_identity_confirmed boolean NOT NULL DEFAULT false;
ALTER TABLE clinical_notes ADD COLUMN patient_response text NOT NULL DEFAULT '';
ALTER TABLE clinical_notes ADD COLUMN patient_response_transcription_acknowledged_at timestamptz;

-- Keep obvious accidental UI payload explosions out of operational records.
ALTER TABLE mileage_logs ADD CONSTRAINT mileage_purpose_length_chk CHECK (char_length(purpose) <= 500);
ALTER TABLE mileage_logs ADD CONSTRAINT mileage_origin_length_chk CHECK (origin IS NULL OR char_length(origin) <= 500);
ALTER TABLE mileage_logs ADD CONSTRAINT mileage_destination_length_chk CHECK (destination IS NULL OR char_length(destination) <= 500);
ALTER TABLE mileage_logs ADD CONSTRAINT mileage_notes_length_chk CHECK (notes IS NULL OR char_length(notes) <= 4000);
ALTER TABLE field_expenses ADD CONSTRAINT expense_merchant_length_chk CHECK (merchant IS NULL OR char_length(merchant) <= 500);
ALTER TABLE field_expenses ADD CONSTRAINT expense_purpose_length_chk CHECK (char_length(purpose) <= 500);
ALTER TABLE field_expenses ADD CONSTRAINT expense_notes_length_chk CHECK (notes IS NULL OR char_length(notes) <= 4000);
