-- Operational field-work tracking. These records are intentionally separate from
-- the signed clinical note so reimbursement workflows can change independently.

CREATE TABLE IF NOT EXISTS mileage_logs (
  id uuid PRIMARY KEY,
  agency_id uuid NOT NULL REFERENCES agencies(id),
  user_id uuid NOT NULL REFERENCES users(id),
  visit_id uuid REFERENCES visits(id),
  patient_id uuid REFERENCES patients(id),
  log_date date NOT NULL,
  vehicle_type text NOT NULL CHECK (vehicle_type IN ('personal','agency','rental')),
  purpose text NOT NULL,
  origin text,
  destination text,
  start_odometer numeric(10,1),
  end_odometer numeric(10,1),
  miles numeric(10,1) NOT NULL CHECK (miles >= 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS field_expenses (
  id uuid PRIMARY KEY,
  agency_id uuid NOT NULL REFERENCES agencies(id),
  user_id uuid NOT NULL REFERENCES users(id),
  visit_id uuid REFERENCES visits(id),
  patient_id uuid REFERENCES patients(id),
  expense_date date NOT NULL,
  category text NOT NULL CHECK (category IN ('fuel','parking','toll','meal','lodging','supplies','other')),
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  merchant text,
  purpose text NOT NULL,
  receipt_document_id uuid REFERENCES source_documents(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mileage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mileage_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY mileage_logs_tenant_isolation ON mileage_logs
  USING (agency_id = nullif(current_setting('app.current_agency_id', true), '')::uuid)
  WITH CHECK (agency_id = nullif(current_setting('app.current_agency_id', true), '')::uuid);

ALTER TABLE field_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_expenses FORCE ROW LEVEL SECURITY;
CREATE POLICY field_expenses_tenant_isolation ON field_expenses
  USING (agency_id = nullif(current_setting('app.current_agency_id', true), '')::uuid)
  WITH CHECK (agency_id = nullif(current_setting('app.current_agency_id', true), '')::uuid);

CREATE INDEX IF NOT EXISTS mileage_logs_user_date_idx ON mileage_logs (agency_id, user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS field_expenses_user_date_idx ON field_expenses (agency_id, user_id, expense_date DESC);
