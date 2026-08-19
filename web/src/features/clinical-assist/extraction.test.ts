import { describe, expect, it } from 'vitest';
import { extractDeterministicSuggestions } from './extraction';

describe('deterministic clinical extraction', () => {
  it('extracts common valid vitals', () => {
    const result = extractDeterministicSuggestions('BP 128/76, HR 72 bpm, SpO2 97%, temp 98.6 F, pain 3/10', 'voice');
    const byField = Object.fromEntries(result.map(item => [item.field, item.value]));
    expect(byField['vitals.systolic']).toBe('128');
    expect(byField['vitals.diastolic']).toBe('76');
    expect(byField['vitals.pulse']).toBe('72');
    expect(byField['vitals.spo2']).toBe('97');
    expect(byField['vitals.temperatureF']).toBe('98.6');
    expect(byField['vitals.pain']).toBe('3');
  });

  it('does not propose impossible values', () => {
    const result = extractDeterministicSuggestions('BP 70/130 HR 999 SpO2 120% temp 150F pain 99/10', 'document');
    expect(result.filter(item => item.field.startsWith('vitals.'))).toHaveLength(0);
  });

  it('supports current ICD-10 U-codes and rejects impossible DOB values', () => {
    const valid = extractDeterministicSuggestions('DOB 03/14/1948 diagnosis U07.1', 'document');
    expect(valid.some(item => item.field === 'patient.dob')).toBe(true);
    expect(valid.some(item => item.field === 'patient.primaryDiagnosisCode' && item.value === 'U07.1')).toBe(true);
    const invalid = extractDeterministicSuggestions('DOB 99/99/2020', 'document');
    expect(invalid.some(item => item.field === 'patient.dob')).toBe(false);
  });

  it('caps very large inputs before analysis', () => {
    const result = extractDeterministicSuggestions(`${'x'.repeat(120_000)} BP 120/80`, 'document');
    expect(result).toHaveLength(0);
  });
});
