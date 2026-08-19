import type { Patient, SuggestedField } from '../../types/domain';
import { formatDate } from '../../utils/format';

function normalizedMrn(value: string) { return value.replace(/[^A-Z0-9]/gi, '').toUpperCase(); }
function normalizedDate(value: string) {
  const slash = value.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (slash) return `${slash[3]}-${slash[1].padStart(2, '0')}-${slash[2].padStart(2, '0')}`;
  return value;
}

export function sourceIdentityWarnings(patient: Patient | undefined, suggestions: SuggestedField[]): string[] {
  if (!patient) return [];
  const warnings: string[] = [];
  const mrn = suggestions.find(item => item.field === 'patient.mrn');
  if (mrn && normalizedMrn(mrn.value) !== normalizedMrn(patient.mrn)) {
    warnings.push(`Document/transcript MRN ${mrn.value} does not match current patient MRN ${patient.mrn}.`);
  }
  const dob = suggestions.find(item => item.field === 'patient.dob');
  if (dob && normalizedDate(dob.value) !== patient.dob) {
    warnings.push(`Document/transcript DOB ${dob.value} does not match current patient DOB ${formatDate(patient.dob)}.`);
  }
  return warnings;
}
