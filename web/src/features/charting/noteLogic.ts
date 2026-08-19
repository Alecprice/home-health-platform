import type { ClinicalNoteDraft, SuggestedField } from '../../types/domain';

export type VitalField = keyof ClinicalNoteDraft['vitals'];

export const vitalRanges: Record<VitalField, { min: number; max: number; label: string }> = {
  systolic: { min: 40, max: 300, label: 'Systolic BP' },
  diastolic: { min: 20, max: 200, label: 'Diastolic BP' },
  pulse: { min: 20, max: 250, label: 'Pulse' },
  temperatureF: { min: 80, max: 115, label: 'Temperature' },
  spo2: { min: 40, max: 100, label: 'SpO₂' },
  pain: { min: 0, max: 10, label: 'Pain' },
  respirations: { min: 4, max: 80, label: 'Respirations' },
  weightLb: { min: 30, max: 1000, label: 'Weight' }
};

export function createEmptyDraft(visitId: string, patientId: string): ClinicalNoteDraft {
  return {
    id: `draft-${visitId}`,
    visitId,
    patientId,
    updatedAt: new Date().toISOString(),
    syncStatus: 'local',
    patientIdentityConfirmed: false,
    medicationsReviewed: false,
    ordersReviewed: false,
    priorContextReviewed: false,
    planOfCareReviewed: false,
    qaStatus: 'not-submitted',
    qaReturnReason: undefined,
    assessmentResponses: [],
    vitals: {},
    narrative: '',
    interventions: '',
    education: '',
    responseToCare: '',
    nextVisitPlan: '',
    patientResponse: '',
    patientResponseTranscriptionAcknowledgedAt: undefined
  };
}

export function parseVitalInput(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function isVitalValueValid(field: VitalField, value: number): boolean {
  const rule = vitalRanges[field];
  return Number.isFinite(value) && value >= rule.min && value <= rule.max;
}

export function validateDraft(draft: ClinicalNoteDraft): string[] {
  const errors: string[] = [];
  for (const [field, value] of Object.entries(draft.vitals) as [VitalField, number | undefined][]) {
    if (value !== undefined && !isVitalValueValid(field, value)) {
      const rule = vitalRanges[field];
      errors.push(`${rule.label} must be between ${rule.min} and ${rule.max}.`);
    }
  }
  if (draft.vitals.systolic !== undefined && draft.vitals.diastolic !== undefined && draft.vitals.systolic <= draft.vitals.diastolic) {
    errors.push('Systolic blood pressure must be greater than diastolic blood pressure.');
  }
  return errors;
}


export function sanitizeStoredDraft(value: unknown, visitId: string, patientId: string): ClinicalNoteDraft | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as Partial<ClinicalNoteDraft>;
  const expectedId = `draft-${visitId}`;
  if (raw.id !== expectedId || raw.visitId !== visitId || raw.patientId !== patientId) return undefined;

  const vitals: ClinicalNoteDraft['vitals'] = {};
  if (raw.vitals && typeof raw.vitals === 'object') {
    for (const field of Object.keys(vitalRanges) as VitalField[]) {
      const candidate = raw.vitals[field];
      if (typeof candidate === 'number' && Number.isFinite(candidate)) vitals[field] = candidate;
    }
  }
  const status = raw.syncStatus === 'local' || raw.syncStatus === 'pending' || raw.syncStatus === 'synced' ? raw.syncStatus : 'local';
  return {
    id: expectedId, visitId, patientId, vitals, syncStatus: status,
    patientIdentityConfirmed: raw.patientIdentityConfirmed === true,
    medicationsReviewed: raw.medicationsReviewed === true,
    ordersReviewed: raw.ordersReviewed === true,
    priorContextReviewed: raw.priorContextReviewed === true,
    planOfCareReviewed: raw.planOfCareReviewed === true,
    qaStatus: raw.qaStatus === 'submitted' || raw.qaStatus === 'returned' || raw.qaStatus === 'approved' ? raw.qaStatus : 'not-submitted',
    qaReturnReason: typeof raw.qaReturnReason === 'string' ? raw.qaReturnReason.slice(0, 4000) : undefined,
    assessmentResponses: Array.isArray(raw.assessmentResponses) ? raw.assessmentResponses.filter((row): row is NonNullable<typeof row> => Boolean(row && typeof row === 'object' && typeof row.fieldId === 'string')).slice(0, 500).map(row => ({ fieldId: row.fieldId.slice(0, 150), value: row.value ?? null, updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : new Date().toISOString() })) : [],
    updatedAt: typeof raw.updatedAt === 'string' && !Number.isNaN(Date.parse(raw.updatedAt)) ? raw.updatedAt : new Date().toISOString(),
    narrative: typeof raw.narrative === 'string' ? raw.narrative.slice(0, 50_000) : '',
    interventions: typeof raw.interventions === 'string' ? raw.interventions.slice(0, 20_000) : '',
    education: typeof raw.education === 'string' ? raw.education.slice(0, 20_000) : '',
    responseToCare: typeof raw.responseToCare === 'string' ? raw.responseToCare.slice(0, 20_000) : '',
    nextVisitPlan: typeof raw.nextVisitPlan === 'string' ? raw.nextVisitPlan.slice(0, 20_000) : '',
    patientResponse: typeof raw.patientResponse === 'string' ? raw.patientResponse.slice(0, 50_000) : '',
    patientResponseTranscriptionAcknowledgedAt: typeof raw.patientResponseTranscriptionAcknowledgedAt === 'string' && !Number.isNaN(Date.parse(raw.patientResponseTranscriptionAcknowledgedAt)) ? raw.patientResponseTranscriptionAcknowledgedAt : undefined
  };
}

export function draftFingerprint(draft: ClinicalNoteDraft): string {
  return JSON.stringify({ patientIdentityConfirmed: draft.patientIdentityConfirmed, medicationsReviewed: draft.medicationsReviewed, ordersReviewed: draft.ordersReviewed, priorContextReviewed: draft.priorContextReviewed, planOfCareReviewed: draft.planOfCareReviewed, qaStatus: draft.qaStatus, qaReturnReason: draft.qaReturnReason, assessmentResponses: draft.assessmentResponses, vitals: draft.vitals, narrative: draft.narrative, interventions: draft.interventions, education: draft.education, responseToCare: draft.responseToCare, nextVisitPlan: draft.nextVisitPlan, patientResponse: draft.patientResponse, patientResponseTranscriptionAcknowledgedAt: draft.patientResponseTranscriptionAcknowledgedAt });
}

export function applyReviewedSuggestions(draft: ClinicalNoteDraft, items: SuggestedField[]) {
  const allowed: Record<string, VitalField> = {
    'vitals.systolic': 'systolic',
    'vitals.diastolic': 'diastolic',
    'vitals.pulse': 'pulse',
    'vitals.temperatureF': 'temperatureF',
    'vitals.spo2': 'spo2',
    'vitals.pain': 'pain'
  };
  let next = draft;
  let applied = 0;
  let deferred = 0;
  let rejected = 0;

  let appliedSystolic = 0;
  let appliedDiastolic = 0;
  for (const item of items) {
    const field = allowed[item.field];
    if (!field) { deferred += 1; continue; }
    const value = Number(item.value);
    if (!isVitalValueValid(field, value)) { rejected += 1; continue; }
    next = { ...next, vitals: { ...next.vitals, [field]: value } };
    if (field === 'systolic') appliedSystolic += 1;
    if (field === 'diastolic') appliedDiastolic += 1;
    applied += 1;
  }

  if (next.vitals.systolic !== undefined && next.vitals.diastolic !== undefined && next.vitals.systolic <= next.vitals.diastolic) {
    next = {
      ...next,
      vitals: {
        ...next.vitals,
        systolic: appliedSystolic ? draft.vitals.systolic : next.vitals.systolic,
        diastolic: appliedDiastolic ? draft.vitals.diastolic : next.vitals.diastolic
      }
    };
    const reverted = appliedSystolic + appliedDiastolic;
    applied -= reverted;
    rejected += reverted;
  }
  return { draft: next, applied, deferred, rejected };
}
