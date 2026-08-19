-- EVV captures are append-only facts. The visits table keeps the current check-in/out
-- convenience fields while this table preserves recaptures and their accuracy/source.
CREATE TABLE IF NOT EXISTS evv_events (
  id uuid PRIMARY KEY,
  agency_id uuid NOT NULL REFERENCES agencies(id),
  visit_id uuid NOT NULL REFERENCES visits(id),
  clinician_id uuid REFERENCES users(id),
  event_type text NOT NULL CHECK (event_type IN ('check-in','check-out')),
  captured_at timestamptz NOT NULL,
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  accuracy_meters double precision NOT NULL CHECK (accuracy_meters >= 0),
  source text NOT NULL CHECK (source IN ('gps','network','web')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE evv_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE evv_events FORCE ROW LEVEL SECURITY;
CREATE POLICY evv_events_tenant_isolation ON evv_events
  USING (agency_id = nullif(current_setting('app.current_agency_id', true), '')::uuid)
  WITH CHECK (agency_id = nullif(current_setting('app.current_agency_id', true), '')::uuid);

CREATE INDEX IF NOT EXISTS evv_events_visit_idx ON evv_events (agency_id, visit_id, captured_at DESC);

CREATE OR REPLACE FUNCTION evv_events_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'evv_events is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER evv_events_no_update
BEFORE UPDATE OR DELETE ON evv_events
FOR EACH ROW EXECUTE FUNCTION evv_events_append_only();

CREATE OR REPLACE FUNCTION apply_evv_event_to_visit() RETURNS trigger AS $$
BEGIN
  IF NEW.event_type = 'check-in' THEN
    UPDATE visits SET check_in_at = NEW.captured_at, check_in_lat = NEW.latitude, check_in_lon = NEW.longitude
      WHERE id = NEW.visit_id AND agency_id = NEW.agency_id;
  ELSE
    UPDATE visits SET check_out_at = NEW.captured_at, check_out_lat = NEW.latitude, check_out_lon = NEW.longitude
      WHERE id = NEW.visit_id AND agency_id = NEW.agency_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER evv_events_apply_to_visit
AFTER INSERT ON evv_events
FOR EACH ROW EXECUTE FUNCTION apply_evv_event_to_visit();
