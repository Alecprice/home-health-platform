CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TYPE user_role AS ENUM ('super_admin','agency_admin','clinician_rn','clinician_pt','clinician_ot','clinician_slp','clinician_aide','scheduler');
CREATE TYPE note_status AS ENUM ('draft','signed','locked','amended');

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id),
  email text NOT NULL,
  display_name text NOT NULL,
  role user_role NOT NULL,
  password_hash text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, email)
);

CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id),
  mrn text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  dob date,
  primary_diagnosis text,
  primary_diagnosis_icd10 text,
  payer_source text,
  referring_physician text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, mrn)
);

CREATE TABLE IF NOT EXISTS episodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id),
  patient_id uuid NOT NULL REFERENCES patients(id),
  start_date date NOT NULL,
  end_date date,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id),
  patient_id uuid NOT NULL REFERENCES patients(id),
  episode_id uuid REFERENCES episodes(id),
  clinician_id uuid REFERENCES users(id),
  scheduled_at timestamptz NOT NULL,
  discipline text NOT NULL,
  visit_type text NOT NULL,
  check_in_at timestamptz,
  check_in_lat double precision,
  check_in_lon double precision,
  check_out_at timestamptz,
  check_out_lat double precision,
  check_out_lon double precision,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clinical_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id),
  patient_id uuid NOT NULL REFERENCES patients(id),
  visit_id uuid NOT NULL REFERENCES visits(id),
  author_id uuid REFERENCES users(id),
  client_generated_id uuid NOT NULL,
  status note_status NOT NULL DEFAULT 'draft',
  vitals jsonb NOT NULL DEFAULT '{}'::jsonb,
  assessment jsonb NOT NULL DEFAULT '{}'::jsonb,
  narrative text NOT NULL DEFAULT '',
  signed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, client_generated_id)
);

CREATE TABLE IF NOT EXISTS source_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id),
  patient_id uuid REFERENCES patients(id),
  uploaded_by uuid REFERENCES users(id),
  document_type text,
  original_filename text,
  mime_type text,
  sha256_hash text,
  storage_key text,
  ocr_text text,
  processing_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS extracted_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id),
  source_document_id uuid REFERENCES source_documents(id),
  patient_id uuid REFERENCES patients(id),
  source_type text NOT NULL CHECK (source_type IN ('document','voice')),
  field_name text NOT NULL,
  raw_text text,
  suggested_value jsonb NOT NULL,
  confidence numeric(4,3),
  review_status text NOT NULL DEFAULT 'proposed',
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id bigserial PRIMARY KEY,
  agency_id uuid,
  user_id uuid,
  action text NOT NULL,
  resource_type text,
  resource_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
