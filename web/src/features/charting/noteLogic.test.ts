import { describe, expect, it } from 'vitest';
import { applyReviewedSuggestions, createEmptyDraft, parseVitalInput, sanitizeStoredDraft, validateDraft } from './noteLogic';
import type { SuggestedField } from '../../types/domain';

const suggestion = (field: string, value: string): SuggestedField => ({
  id: `${field}-${value}`,
  label: field,
  field,
  value,
  confidence: 0.99,
  source: 'voice',
  selected: true
});

describe('clinical note validation', () => {
  it('parses only finite values', () => {
    expect(parseVitalInput('98.6')).toBe(98.6);
    expect(parseVitalInput('')).toBeUndefined();
    expect(parseVitalInput('Infinity')).toBeUndefined();
  });

  it('blocks impossible vital ranges and inverted blood pressure', () => {
    const draft = createEmptyDraft('v1', 'p1');
    draft.vitals = { systolic: 80, diastolic: 120, pulse: 500, spo2: 101, pain: 11 };
    expect(validateDraft(draft)).toHaveLength(4);
  });

  it('applies whitelisted suggestions and defers non-vital fields', () => {
    const draft = createEmptyDraft('v1', 'p1');
    const result = applyReviewedSuggestions(draft, [
      suggestion('vitals.spo2', '97'),
      suggestion('patient.mrn', 'ABC123')
    ]);
    expect(result.applied).toBe(1);
    expect(result.deferred).toBe(1);
    expect(result.draft.vitals.spo2).toBe(97);
  });

  it('rejects out-of-range and relationship-invalid suggested blood pressure', () => {
    const draft = createEmptyDraft('v1', 'p1');
    const result = applyReviewedSuggestions(draft, [
      suggestion('vitals.systolic', '80'),
      suggestion('vitals.diastolic', '120'),
      suggestion('vitals.pain', '99')
    ]);
    expect(result.applied).toBe(0);
    expect(result.rejected).toBe(3);
    expect(result.draft.vitals.systolic).toBeUndefined();
    expect(result.draft.vitals.diastolic).toBeUndefined();
  });

  it('rejects cross-patient device drafts and sanitizes corrupted local fields', () => {
    expect(sanitizeStoredDraft({ id: 'draft-v1', visitId: 'v1', patientId: 'wrong' }, 'v1', 'p1')).toBeUndefined();
    const safe = sanitizeStoredDraft({
      id: 'draft-v1', visitId: 'v1', patientId: 'p1', syncStatus: 'bad', updatedAt: 'bad',
      vitals: { spo2: 97, pulse: 'oops' }, narrative: 'x'.repeat(60_000), patientResponse: 'y'.repeat(60_000)
    }, 'v1', 'p1');
    expect(safe?.vitals.spo2).toBe(97);
    expect(safe?.vitals.pulse).toBeUndefined();
    expect(safe?.narrative).toHaveLength(50_000);
    expect(safe?.patientResponse).toHaveLength(50_000);
  });
});
