export type WorkflowStepId =
  | 'patient-review'
  | 'evv-check-in'
  | 'clinical-context'
  | 'assessment'
  | 'clinical-assist'
  | 'review-sign'
  | 'evv-check-out'
  | 'field-work';

export interface WorkflowStepDefinition {
  id: WorkflowStepId;
  label: string;
  shortLabel: string;
  description: string;
  optional: boolean;
}

export interface WorkflowPreset {
  id: string;
  version: number;
  name: string;
  description: string;
  steps: WorkflowStepId[];
}

export const workflowSteps: Record<WorkflowStepId, WorkflowStepDefinition> = {
  'patient-review': {
    id: 'patient-review',
    label: 'Review patient',
    shortLabel: 'Patient',
    description: 'Confirm patient identity, visit reason, allergies, diagnosis, and key chart information.',
    optional: false
  },
  'evv-check-in': {
    id: 'evv-check-in',
    label: 'EVV check-in',
    shortLabel: 'Check in',
    description: 'Capture visit start time and, when enabled, location for electronic visit verification.',
    optional: true
  },
  'clinical-context': {
    id: 'clinical-context',
    label: 'Review clinical context',
    shortLabel: 'Context',
    description: 'Review medication list, active plan/orders/goals, recent notes/trends, and wounds before documenting today.',
    optional: false
  },
  assessment: {
    id: 'assessment',
    label: 'Assessment & charting',
    shortLabel: 'Chart',
    description: 'Record vitals, structured assessment data, interventions, education, and narrative.',
    optional: false
  },
  'clinical-assist': {
    id: 'clinical-assist',
    label: 'Clinical Assist',
    shortLabel: 'Assist',
    description: 'Optional voice, patient-response, scanning, OCR, and reviewed autofill assistance.',
    optional: true
  },
  'review-sign': {
    id: 'review-sign',
    label: 'Review & sign',
    shortLabel: 'Sign',
    description: 'Run required validation, review the complete note, and sign the legal record.',
    optional: false
  },
  'evv-check-out': {
    id: 'evv-check-out',
    label: 'EVV check-out',
    shortLabel: 'Check out',
    description: 'Capture visit end time/location and calculate visit duration.',
    optional: true
  },
  'field-work': {
    id: 'field-work',
    label: 'Mileage & expenses',
    shortLabel: 'Field work',
    description: 'Optionally log business mileage, fuel, parking, tolls, supplies, and other reimbursable field costs.',
    optional: true
  }
};

export const workflowPresets: WorkflowPreset[] = [
  {
    id: 'recommended',
    version: 1,
    name: 'Recommended field workflow',
    description: 'Patient review → EVV check-in → charting/assist → EVV check-out → review/sign → optional field-work log.',
    steps: ['patient-review', 'evv-check-in', 'clinical-context', 'assessment', 'clinical-assist', 'evv-check-out', 'review-sign', 'field-work']
  },
  {
    id: 'lean-demo',
    version: 1,
    name: 'Lean demo workflow',
    description: 'Fast product demo with only patient review, charting, assist, and sign.',
    steps: ['patient-review', 'clinical-context', 'assessment', 'clinical-assist', 'review-sign']
  },
  {
    id: 'documentation-first',
    version: 1,
    name: 'Documentation-first',
    description: 'Moves assist before the assessment for teams that begin from referral documents or dictated history.',
    steps: ['patient-review', 'clinical-context', 'clinical-assist', 'assessment', 'review-sign', 'field-work']
  }
];

export const recommendedWorkflow = workflowPresets[0];
