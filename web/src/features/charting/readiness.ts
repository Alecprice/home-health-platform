import type { ClinicalNoteDraft, EvvCapture } from '../../types/domain';
import { validateDraft } from './noteLogic';

export interface VisitReadinessOptions {
  requireCheckIn: boolean;
  requireCheckOut: boolean;
  checkIn: EvvCapture | null;
  checkOut: EvvCapture | null;
}

export interface ReadinessItem {
  id: string;
  label: string;
  complete: boolean;
  detail: string;
}

export function evvChronologyValid(checkIn: EvvCapture | null, checkOut: EvvCapture | null): boolean {
  if (!checkIn || !checkOut) return true;
  const start = Date.parse(checkIn.capturedAt);
  const end = Date.parse(checkOut.capturedAt);
  return Number.isFinite(start) && Number.isFinite(end) && end >= start;
}

export function buildVisitReadiness(draft: ClinicalNoteDraft, options: VisitReadinessOptions): ReadinessItem[] {
  const vitalsValid = validateDraft(draft).length === 0;
  const narrativeLength = draft.narrative.trim().length;
  const chronologyValid = evvChronologyValid(options.checkIn, options.checkOut);
  const items: ReadinessItem[] = [
    {
      id: 'identity', label: 'Patient identity confirmed', complete: draft.patientIdentityConfirmed,
      detail: draft.patientIdentityConfirmed ? 'Confirmed for this visit.' : 'Confirm the patient before final review.'
    },

    {
      id: 'clinical-context', label: 'Clinical context reviewed', complete: draft.medicationsReviewed && draft.ordersReviewed && draft.planOfCareReviewed && draft.priorContextReviewed,
      detail: draft.medicationsReviewed && draft.ordersReviewed && draft.planOfCareReviewed && draft.priorContextReviewed
        ? 'Medication list, orders/plan of care, and recent context were reviewed for this visit.'
        : 'Review medications, active orders/plan of care, and recent clinical context before final review.'
    },
    {
      id: 'vitals', label: 'Entered vital values are valid', complete: vitalsValid,
      detail: vitalsValid ? 'No range/relationship errors detected.' : 'Correct highlighted vital values.'
    },
    {
      id: 'narrative', label: 'Visit narrative documented', complete: narrativeLength >= 20,
      detail: narrativeLength >= 20 ? 'Narrative has meaningful content.' : 'Add a meaningful visit narrative before signing.'
    }
  ];

  items.push({
    id: 'structured-assessment', label: 'Structured assessment documented', complete: draft.assessmentResponses.length > 0,
    detail: draft.assessmentResponses.length > 0 ? `${draft.assessmentResponses.length} structured assessment response(s) documented.` : 'Complete applicable discipline-specific assessment items before final review.'
  });
  items.push({
    id: 'skilled-care', label: 'Skilled care and follow-up documented', complete: draft.interventions.trim().length >= 10 && draft.responseToCare.trim().length >= 5 && draft.nextVisitPlan.trim().length >= 5,
    detail: draft.interventions.trim().length >= 10 && draft.responseToCare.trim().length >= 5 && draft.nextVisitPlan.trim().length >= 5
      ? 'Interventions, response, and next-visit/follow-up plan are documented.'
      : 'Document skilled interventions, the patient response, and the next-visit/follow-up plan.'
  });

  if (draft.patientResponse.trim()) items.push({
    id: 'patient-response-awareness',
    label: 'Patient-response transcription awareness documented',
    complete: Boolean(draft.patientResponseTranscriptionAcknowledgedAt),
    detail: draft.patientResponseTranscriptionAcknowledgedAt
      ? 'Patient/authorized representative awareness was documented for speech-to-text capture.'
      : 'A patient-response transcript exists without a documented speech-to-text acknowledgement. Confirm the source before signing.'
  });

  if (options.requireCheckIn) items.push({
    id: 'check-in', label: 'EVV check-in captured', complete: Boolean(options.checkIn),
    detail: options.checkIn ? 'Check-in is stored on this device.' : 'Capture check-in before completing the visit.'
  });
  if (options.requireCheckOut) items.push({
    id: 'check-out', label: 'EVV check-out captured', complete: Boolean(options.checkOut) && chronologyValid,
    detail: !options.checkOut ? 'Capture check-out before finalizing the visit.' : chronologyValid ? 'Check-out is stored on this device.' : 'EVV timestamps are reversed. Recapture/correct the visit sequence before signing.'
  });
  return items;
}

export function signatureBlockers(items: ReadinessItem[]): string[] {
  return items.filter(item => !item.complete).map(item => item.detail);
}
