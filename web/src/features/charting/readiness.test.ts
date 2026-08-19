import { describe, expect, it } from 'vitest';
import { createEmptyDraft } from './noteLogic';
import { buildVisitReadiness, evvChronologyValid, signatureBlockers } from './readiness';

const opts = { requireCheckIn: true, requireCheckOut: true, checkIn: null, checkOut: null };

describe('visit readiness', () => {
  it('does not treat an empty draft as sign-ready', () => {
    const draft = createEmptyDraft('v1', 'p1');
    expect(signatureBlockers(buildVisitReadiness(draft, opts)).length).toBeGreaterThanOrEqual(4);
  });

  it('rejects check-out timestamps earlier than check-in', () => {
    const base = { id:'e', visitId:'v', latitude:0, longitude:0, accuracyMeters:5, source:'device' as const, syncStatus:'pending' as const };
    expect(evvChronologyValid({ ...base, kind:'check-in', capturedAt:'2026-08-18T10:30:00Z' }, { ...base, id:'e2', kind:'check-out', capturedAt:'2026-08-18T10:00:00Z' })).toBe(false);
  });

  it('requires explicit patient identity confirmation', () => {
    const draft = createEmptyDraft('v1', 'p1');
    draft.narrative = 'Skilled visit completed with assessment and education documented.';
    const items = buildVisitReadiness(draft, { ...opts, requireCheckIn: false, requireCheckOut: false });
    expect(items.find(item => item.id === 'identity')?.complete).toBe(false);
  });
  it('requires persisted acknowledgement when a patient-response transcript exists', () => {
    const draft = createEmptyDraft('v2', 'p2');
    draft.patientIdentityConfirmed = true;
    draft.narrative = 'Skilled assessment and education completed during the home visit.';
    draft.patientResponse = 'Patient reports pain increases when walking.';
    let items = buildVisitReadiness(draft, { ...opts, requireCheckIn: false, requireCheckOut: false });
    expect(items.find(item => item.id === 'patient-response-awareness')?.complete).toBe(false);
    draft.patientResponseTranscriptionAcknowledgedAt = '2026-08-18T20:00:00Z';
    items = buildVisitReadiness(draft, { ...opts, requireCheckIn: false, requireCheckOut: false });
    expect(items.find(item => item.id === 'patient-response-awareness')?.complete).toBe(true);
  });

});
