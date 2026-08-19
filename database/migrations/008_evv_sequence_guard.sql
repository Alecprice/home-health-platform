-- Preserve append-only EVV facts while rejecting impossible visit chronology.
-- Offline events may arrive at the server out of insertion order, so compare captured_at,
-- not created_at or insertion order.

CREATE OR REPLACE FUNCTION enforce_evv_capture_sequence() RETURNS trigger AS $$
BEGIN
  -- Serialize chronology checks for one agency/visit across concurrent device sync.
  -- Hash collisions only over-serialize unrelated visits; they cannot weaken integrity.
  PERFORM pg_advisory_xact_lock(hashtext(NEW.agency_id::text), hashtext(NEW.visit_id::text));

  IF NEW.event_type = 'check-in' AND EXISTS (
    SELECT 1 FROM evv_events e
    WHERE e.agency_id = NEW.agency_id
      AND e.visit_id = NEW.visit_id
      AND e.event_type = 'check-out'
      AND e.captured_at < NEW.captured_at
  ) THEN
    RAISE EXCEPTION 'EVV check-in cannot be captured after an existing check-out';
  END IF;

  IF NEW.event_type = 'check-out' AND EXISTS (
    SELECT 1 FROM evv_events e
    WHERE e.agency_id = NEW.agency_id
      AND e.visit_id = NEW.visit_id
      AND e.event_type = 'check-in'
      AND e.captured_at > NEW.captured_at
  ) THEN
    RAISE EXCEPTION 'EVV check-out cannot precede an existing check-in';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER evv_events_sequence_guard
BEFORE INSERT ON evv_events
FOR EACH ROW EXECUTE FUNCTION enforce_evv_capture_sequence();
