import type { Patient } from '../types/domain';

export function formatDate(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;
  return `${match[2]}/${match[3]}/${match[1]}`;
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], { month: '2-digit', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function allergySummary(patient: Patient): { text: string; urgent: boolean } {
  if (patient.allergyStatus === 'not-reviewed') return { text: 'ALLERGIES NOT REVIEWED', urgent: true };
  if (patient.allergyStatus === 'nkda') return { text: 'NKDA', urgent: false };
  if (!patient.allergies.length) return { text: 'Allergy list incomplete', urgent: true };
  return { text: patient.allergies.join(', '), urgent: true };
}
