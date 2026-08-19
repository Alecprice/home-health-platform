import type { SuggestedField } from '../../types/domain';
import { createUuid } from '../../utils/id';

function suggestion(label: string, field: string, value: string, confidence: number, source: 'voice' | 'document'): SuggestedField {
  return { id: createUuid(), label, field, value, confidence, source, selected: false };
}

function numberInRange(value: string | undefined, min: number, max: number): value is string {
  if (value === undefined) return false;
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max;
}

function isValidCalendarDate(value: string): boolean {
  const match = value.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (!match) return false;
  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  if (year < 1800 || year > new Date().getFullYear() || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

export function extractDeterministicSuggestions(text: string, source: 'voice' | 'document'): SuggestedField[] {
  const found: SuggestedField[] = [];
  const compact = text.slice(0, 100_000).replace(/\s+/g, ' ').trim();

  const bp = compact.match(/(?:BP|blood pressure)\s*[:\-]?\s*(\d{2,3})\s*\/\s*(\d{2,3})/i);
  if (bp && numberInRange(bp[1], 40, 300) && numberInRange(bp[2], 20, 200) && Number(bp[1]) > Number(bp[2])) {
    found.push(suggestion('Systolic BP', 'vitals.systolic', bp[1], 0.98, source));
    found.push(suggestion('Diastolic BP', 'vitals.diastolic', bp[2], 0.98, source));
  }

  const spo2 = compact.match(/(?:SpO2|oxygen saturation|O2 sat)\s*[:\-]?\s*(\d{2,3})\s*%?/i);
  if (spo2 && numberInRange(spo2[1], 40, 100)) found.push(suggestion('SpO₂', 'vitals.spo2', spo2[1], 0.96, source));

  const pulse = compact.match(/(?:pulse|heart rate|HR)\s*[:\-]?\s*(\d{2,3})\s*(?:bpm)?/i);
  if (pulse && numberInRange(pulse[1], 20, 250)) found.push(suggestion('Pulse', 'vitals.pulse', pulse[1], 0.95, source));

  const temperature = compact.match(/(?:temperature|temp)\s*[:\-]?\s*(\d{2,3}(?:\.\d)?)\s*(?:°?F|degrees?)?/i);
  if (temperature && numberInRange(temperature[1], 80, 115)) found.push(suggestion('Temperature °F', 'vitals.temperatureF', temperature[1], 0.94, source));

  const pain = compact.match(/(?:pain(?: score)?(?: is| of)?|rates? (?:his|her|their)?\s*pain)\s*[:\-]?\s*(\d{1,2})(?:\s*\/\s*10|\s*out of 10)?/i);
  if (pain && numberInRange(pain[1], 0, 10)) found.push(suggestion('Pain score', 'vitals.pain', pain[1], 0.9, source));

  const dob = compact.match(/(?:DOB|date of birth)\s*[:\-]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i);
  if (dob && isValidCalendarDate(dob[1])) found.push(suggestion('Date of birth', 'patient.dob', dob[1], 0.96, source));

  const mrn = compact.match(/(?:MRN|medical record number)\s*[:#\-]?\s*([A-Z0-9\-]{4,20})/i);
  if (mrn) found.push(suggestion('MRN', 'patient.mrn', mrn[1], 0.94, source));

  const icd10 = compact.match(/\b([A-Z][0-9][0-9A-Z](?:\.[A-Z0-9]{1,4})?)\b/i);
  if (icd10) found.push(suggestion('ICD-10', 'patient.primaryDiagnosisCode', icd10[1].toUpperCase(), 0.88, source));

  return found;
}
