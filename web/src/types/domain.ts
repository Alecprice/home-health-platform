export type Discipline = 'RN' | 'PT' | 'OT' | 'SLP' | 'Aide' | 'MSW';
export type VisitStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'missed';
export type AllergyStatus = 'known' | 'nkda' | 'not-reviewed';
export type MedicationStatus = 'active' | 'held' | 'discontinued';
export type OrderStatus = 'active' | 'completed' | 'discontinued';
export type GoalStatus = 'active' | 'met' | 'not-met' | 'discontinued';
export type QANoteStatus = 'not-submitted' | 'submitted' | 'returned' | 'approved';

export interface Patient {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dob: string;
  primaryDiagnosis: string;
  primaryDiagnosisCode: string;
  payer: string;
  phone: string;
  address: string;
  physician: string;
  allergies: string[];
  allergyStatus: AllergyStatus;
}

export interface Visit {
  id: string;
  patientId: string;
  scheduledAt: string;
  discipline: Discipline;
  type: string;
  status: VisitStatus;
}

export interface Medication {
  id: string;
  patientId: string;
  name: string;
  strength?: string;
  dose?: string;
  route?: string;
  frequency?: string;
  indication?: string;
  status: MedicationStatus;
  highRisk?: boolean;
  startedOn?: string;
  lastReconciledAt?: string;
  notes?: string;
}

export interface PlanOfCare {
  id: string;
  patientId: string;
  episodeLabel: string;
  effectiveFrom: string;
  effectiveTo?: string;
  certifyingProvider: string;
  frequencySummary: string;
  precautions: string[];
  homeboundReason?: string;
  skilledNeed: string;
  status: 'active' | 'superseded' | 'closed';
}

export interface ClinicalOrder {
  id: string;
  patientId: string;
  orderedAt: string;
  orderedBy: string;
  discipline?: Discipline;
  category: string;
  text: string;
  status: OrderStatus;
  requiresFollowUp?: boolean;
}

export interface CareGoal {
  id: string;
  patientId: string;
  discipline: Discipline;
  description: string;
  targetDate?: string;
  status: GoalStatus;
  progress?: string;
}

export interface PriorNoteSummary {
  id: string;
  patientId: string;
  visitId: string;
  discipline: Discipline;
  occurredAt: string;
  author: string;
  summary: string;
  concerns: string[];
  vitals?: Partial<ClinicalNoteDraft['vitals']>;
}

export interface WoundRecord {
  id: string;
  patientId: string;
  label: string;
  location: string;
  woundType: string;
  onsetDate?: string;
  status: 'active' | 'healed';
  lengthCm?: number;
  widthCm?: number;
  depthCm?: number;
  drainage?: string;
  tissue?: string;
  lastMeasuredAt?: string;
  treatmentOrder?: string;
}

export type AssessmentResponseValue = string | number | boolean | string[] | null;

export interface AssessmentResponse {
  fieldId: string;
  value: AssessmentResponseValue;
  updatedAt: string;
}

export interface ClinicalNoteDraft {
  id: string;
  visitId: string;
  patientId: string;
  updatedAt: string;
  syncStatus: 'local' | 'pending' | 'synced';
  patientIdentityConfirmed: boolean;
  medicationsReviewed: boolean;
  ordersReviewed: boolean;
  priorContextReviewed: boolean;
  planOfCareReviewed: boolean;
  qaStatus: QANoteStatus;
  qaReturnReason?: string;
  assessmentResponses: AssessmentResponse[];
  vitals: {
    systolic?: number;
    diastolic?: number;
    pulse?: number;
    temperatureF?: number;
    spo2?: number;
    pain?: number;
    respirations?: number;
    weightLb?: number;
  };
  narrative: string;
  interventions: string;
  education: string;
  responseToCare: string;
  nextVisitPlan: string;
  patientResponse: string;
  patientResponseTranscriptionAcknowledgedAt?: string;
}

export interface SuggestedField {
  id: string;
  label: string;
  field: string;
  value: string;
  confidence: number;
  source: 'voice' | 'document';
  selected: boolean;
}

export type VehicleType = 'personal' | 'agency' | 'rental';
export type ExpenseCategory = 'fuel' | 'parking' | 'toll' | 'meal' | 'lodging' | 'supplies' | 'other';

export interface MileageLog {
  id: string;
  date: string;
  visitId?: string;
  patientId?: string;
  vehicleType: VehicleType;
  purpose: string;
  origin?: string;
  destination?: string;
  startOdometer?: number;
  endOdometer?: number;
  miles: number;
  notes?: string;
  createdAt: string;
}

export interface EvvCapture {
  id: string;
  visitId: string;
  kind: 'check-in' | 'check-out';
  capturedAt: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  source: 'device' | 'web';
  syncStatus: 'pending' | 'synced';
}

export interface FieldExpense {
  id: string;
  date: string;
  visitId?: string;
  patientId?: string;
  category: ExpenseCategory;
  amount: number;
  merchant?: string;
  purpose: string;
  receiptName?: string;
  receiptUri?: string;
  receiptPreviewUrl?: string;
  notes?: string;
  createdAt: string;
}
