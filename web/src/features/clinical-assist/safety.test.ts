import { describe, expect, it } from 'vitest';
import { sourceIdentityWarnings } from './safety';
import type { Patient, SuggestedField } from '../../types/domain';

const patient: Patient = { id:'p', mrn:'ABC-123', firstName:'A', lastName:'B', dob:'1948-03-14', primaryDiagnosis:'x', primaryDiagnosisCode:'X00', payer:'Demo', phone:'', address:'', physician:'', allergies:[], allergyStatus:'nkda' };
const item = (field: string, value: string): SuggestedField => ({ id:field, label:field, field, value, confidence:.9, source:'document', selected:false });

describe('clinical assist patient identity safety', () => {
  it('accepts normalized matching identifiers', () => {
    expect(sourceIdentityWarnings(patient, [item('patient.mrn','abc123'), item('patient.dob','03/14/1948')])).toEqual([]);
  });
  it('blocks mismatched MRN or DOB', () => {
    expect(sourceIdentityWarnings(patient, [item('patient.mrn','ZZZ999'), item('patient.dob','03/15/1948')])).toHaveLength(2);
  });
});
