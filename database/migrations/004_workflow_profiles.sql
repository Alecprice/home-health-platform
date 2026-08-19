-- Versioned agency workflow profiles support iterative UX changes without
-- rewriting clinical-note rows. A future admin UI can activate any retained
-- version to roll an agency back to a previous flow.

CREATE TABLE IF NOT EXISTS workflow_profiles (
  id uuid PRIMARY KEY,
  agency_id uuid NOT NULL REFERENCES agencies(id),
  name text NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  steps jsonb NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  retired_at timestamptz,
  UNIQUE (agency_id, name, version)
);

ALTER TABLE workflow_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_profiles FORCE ROW LEVEL SECURITY;
CREATE POLICY workflow_profiles_tenant_isolation ON workflow_profiles
  USING (agency_id = nullif(current_setting('app.current_agency_id', true), '')::uuid)
  WITH CHECK (agency_id = nullif(current_setting('app.current_agency_id', true), '')::uuid);

CREATE UNIQUE INDEX IF NOT EXISTS workflow_profiles_one_active_idx
  ON workflow_profiles (agency_id)
  WHERE is_active = true;
