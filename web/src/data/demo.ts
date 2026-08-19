import type { Patient, Visit, Medication, PlanOfCare, ClinicalOrder, CareGoal, PriorNoteSummary, WoundRecord } from '../types/domain';

export const demoPatients: Patient[] = [
  {
    id: 'p-001', mrn: 'DEMO-1001', firstName: 'Martha', lastName: 'Hayes', dob: '1948-03-14',
    primaryDiagnosis: 'Chronic diastolic heart failure', primaryDiagnosisCode: 'I50.32', payer: 'Medicare',
    phone: '(555) 010-4412', address: '125 Oak Meadow Drive, Greeneville, TN', physician: 'Sarah Williams, MD',
    allergies: ['Penicillin'], allergyStatus: 'known'
  },
  {
    id: 'p-002', mrn: 'DEMO-1002', firstName: 'Robert', lastName: 'Carson', dob: '1956-11-02',
    primaryDiagnosis: 'Type 2 diabetes mellitus', primaryDiagnosisCode: 'E11.9', payer: 'Medicare',
    phone: '(555) 010-2298', address: '803 Valley View Lane, Greeneville, TN', physician: 'Daniel Brooks, DO',
    allergies: ['Sulfa drugs'], allergyStatus: 'known'
  },
  {
    id: 'p-003', mrn: 'DEMO-1003', firstName: 'Evelyn', lastName: 'Moore', dob: '1939-07-27',
    primaryDiagnosis: 'Unilateral primary osteoarthritis, right knee', primaryDiagnosisCode: 'M17.11', payer: 'Medicare Advantage',
    phone: '(555) 010-7715', address: '41 Cedar Ridge Road, Tusculum, TN', physician: 'Michael Chen, MD', allergies: [], allergyStatus: 'nkda'
  },
  {
    id: 'p-004', mrn: 'DEMO-1004', firstName: 'James', lastName: 'Walker', dob: '1963-01-18',
    primaryDiagnosis: 'Chronic obstructive pulmonary disease', primaryDiagnosisCode: 'J44.9', payer: 'Medicaid',
    phone: '(555) 010-6630', address: '219 Meadow Creek Way, Greeneville, TN', physician: 'Lisa Patel, MD', allergies: ['Codeine'], allergyStatus: 'known'
  }
];

export const demoVisits: Visit[] = [
  { id: 'v-001', patientId: 'p-001', scheduledAt: '2026-08-18T08:00:00', discipline: 'RN', type: 'Skilled Nursing', status: 'scheduled' },
  { id: 'v-002', patientId: 'p-002', scheduledAt: '2026-08-18T10:30:00', discipline: 'RN', type: 'Medication Management', status: 'scheduled' },
  { id: 'v-003', patientId: 'p-003', scheduledAt: '2026-08-18T13:00:00', discipline: 'PT', type: 'Physical Therapy', status: 'scheduled' },
  { id: 'v-004', patientId: 'p-004', scheduledAt: '2026-08-18T15:15:00', discipline: 'RN', type: 'Cardiopulmonary Assessment', status: 'scheduled' }
];

export function patientName(patient: Patient) {
  return `${patient.firstName} ${patient.lastName}`;
}


export const demoMedications: Medication[] = [
  { id: 'med-001', patientId: 'p-001', name: 'Furosemide', strength: '40 mg', dose: '1 tablet', route: 'PO', frequency: 'every morning', indication: 'Edema/CHF', status: 'active', highRisk: false, lastReconciledAt: '2026-08-17T14:10:00' },
  { id: 'med-002', patientId: 'p-001', name: 'Apixaban', strength: '5 mg', dose: '1 tablet', route: 'PO', frequency: 'twice daily', indication: 'Atrial fibrillation', status: 'active', highRisk: true, lastReconciledAt: '2026-08-17T14:10:00', notes: 'Bleeding precautions reviewed.' },
  { id: 'med-003', patientId: 'p-001', name: 'Metoprolol succinate ER', strength: '50 mg', dose: '1 tablet', route: 'PO', frequency: 'daily', indication: 'Rate/BP control', status: 'active', lastReconciledAt: '2026-08-17T14:10:00' },
  { id: 'med-004', patientId: 'p-002', name: 'Metformin', strength: '500 mg', dose: '1 tablet', route: 'PO', frequency: 'twice daily with meals', indication: 'Diabetes', status: 'active', lastReconciledAt: '2026-08-16T10:00:00' },
  { id: 'med-005', patientId: 'p-002', name: 'Insulin glargine', strength: '100 units/mL', dose: '18 units', route: 'subcutaneous', frequency: 'nightly', indication: 'Diabetes', status: 'active', highRisk: true, lastReconciledAt: '2026-08-16T10:00:00' },
  { id: 'med-006', patientId: 'p-003', name: 'Acetaminophen', strength: '500 mg', dose: '2 tablets', route: 'PO', frequency: 'every 8 hours as needed', indication: 'Knee pain', status: 'active', lastReconciledAt: '2026-08-15T12:00:00' },
  { id: 'med-007', patientId: 'p-004', name: 'Albuterol HFA', strength: '90 mcg', dose: '2 puffs', route: 'inhaled', frequency: 'every 4-6 hours as needed', indication: 'Dyspnea/wheeze', status: 'active', lastReconciledAt: '2026-08-17T09:00:00' }
];

export const demoPlansOfCare: PlanOfCare[] = [
  { id: 'poc-001', patientId: 'p-001', episodeLabel: 'Episode 07/20/26–09/17/26', effectiveFrom: '2026-07-20', effectiveTo: '2026-09-17', certifyingProvider: 'Sarah Williams, MD', frequencySummary: 'SN 2w3 then 1w4; PRN x2 for cardiopulmonary change', precautions: ['Fall precautions', 'Bleeding precautions', 'Daily weights'], homeboundReason: 'Requires taxing effort and assistive device due to dyspnea and weakness.', skilledNeed: 'Cardiopulmonary assessment, medication management, disease-process teaching.', status: 'active' },
  { id: 'poc-002', patientId: 'p-002', episodeLabel: 'Episode 08/01/26–09/29/26', effectiveFrom: '2026-08-01', effectiveTo: '2026-09-29', certifyingProvider: 'Daniel Brooks, DO', frequencySummary: 'SN 1w6', precautions: ['Hypoglycemia precautions', 'Fall precautions'], homeboundReason: 'Limited endurance and requires assistance leaving home.', skilledNeed: 'Diabetes education, medication reconciliation, glucose monitoring.', status: 'active' },
  { id: 'poc-003', patientId: 'p-003', episodeLabel: 'Episode 08/10/26–10/08/26', effectiveFrom: '2026-08-10', effectiveTo: '2026-10-08', certifyingProvider: 'Michael Chen, MD', frequencySummary: 'PT 2w4 then 1w2', precautions: ['Fall precautions', 'WBAT right lower extremity'], skilledNeed: 'Therapeutic exercise, gait training, transfer training, home safety.', status: 'active' },
  { id: 'poc-004', patientId: 'p-004', episodeLabel: 'Episode 08/05/26–10/03/26', effectiveFrom: '2026-08-05', effectiveTo: '2026-10-03', certifyingProvider: 'Lisa Patel, MD', frequencySummary: 'SN 2w2 then 1w5', precautions: ['Oxygen safety', 'Fall precautions'], skilledNeed: 'Cardiopulmonary assessment and COPD teaching.', status: 'active' }
];

export const demoOrders: ClinicalOrder[] = [
  { id: 'ord-001', patientId: 'p-001', orderedAt: '2026-08-15T11:30:00', orderedBy: 'Sarah Williams, MD', discipline: 'RN', category: 'Parameters', text: 'Notify provider for weight gain >2 lb in 24 hours or >5 lb in 7 days, increasing edema, or worsening dyspnea.', status: 'active', requiresFollowUp: true },
  { id: 'ord-002', patientId: 'p-001', orderedAt: '2026-08-15T11:30:00', orderedBy: 'Sarah Williams, MD', discipline: 'RN', category: 'Medication', text: 'Continue current diuretic regimen; reconcile all medications each skilled nursing visit.', status: 'active' },
  { id: 'ord-003', patientId: 'p-002', orderedAt: '2026-08-12T08:40:00', orderedBy: 'Daniel Brooks, DO', discipline: 'RN', category: 'Glucose', text: 'Review home glucose log and notify for repeated readings <70 or >300 mg/dL.', status: 'active', requiresFollowUp: true },
  { id: 'ord-004', patientId: 'p-003', orderedAt: '2026-08-10T13:00:00', orderedBy: 'Michael Chen, MD', discipline: 'PT', category: 'Therapy', text: 'Progress gait and strengthening as tolerated; WBAT RLE.', status: 'active' }
];

export const demoGoals: CareGoal[] = [
  { id: 'goal-001', patientId: 'p-001', discipline: 'RN', description: 'Patient/caregiver will verbalize CHF zone-management and when to call provider.', targetDate: '2026-09-10', status: 'active', progress: 'Needs reinforcement on weight-gain parameters.' },
  { id: 'goal-002', patientId: 'p-001', discipline: 'RN', description: 'Patient will demonstrate medication regimen using current medication list.', targetDate: '2026-09-10', status: 'active', progress: 'Partially met.' },
  { id: 'goal-003', patientId: 'p-003', discipline: 'PT', description: 'Ambulate 150 ft with rolling walker and supervision without loss of balance.', targetDate: '2026-09-25', status: 'active', progress: 'Currently 90 ft with contact guard assist.' }
];

export const demoPriorNotes: PriorNoteSummary[] = [
  { id: 'pn-001', patientId: 'p-001', visitId: 'historic-v-001', discipline: 'RN', occurredAt: '2026-08-17T14:00:00', author: 'Demo RN', summary: 'Mild bilateral ankle edema. Weight 171 lb, up 1 lb from prior visit. Denied dyspnea at rest; mild exertional dyspnea. Medication box correct after teaching.', concerns: ['Trend weight/edema', 'Reinforce CHF call parameters'], vitals: { systolic: 132, diastolic: 76, pulse: 72, spo2: 95, weightLb: 171 } },
  { id: 'pn-002', patientId: 'p-001', visitId: 'historic-v-002', discipline: 'RN', occurredAt: '2026-08-14T09:30:00', author: 'Demo RN', summary: 'Weight 170 lb. Trace ankle edema. No chest pain. Reviewed low-sodium diet.', concerns: [], vitals: { systolic: 128, diastolic: 74, pulse: 70, spo2: 96, weightLb: 170 } },
  { id: 'pn-003', patientId: 'p-002', visitId: 'historic-v-003', discipline: 'RN', occurredAt: '2026-08-16T10:00:00', author: 'Demo RN', summary: 'Patient had two fasting glucose values in 80s; no symptomatic hypoglycemia. Injection technique reviewed.', concerns: ['Continue glucose-log review'] },
  { id: 'pn-004', patientId: 'p-003', visitId: 'historic-v-004', discipline: 'PT', occurredAt: '2026-08-16T13:00:00', author: 'Demo PT', summary: 'Ambulated 90 ft with rolling walker and contact guard. Right knee pain 4/10 with activity.', concerns: ['Fall risk', 'Progress gait distance'], vitals: { pain: 4 } }
];

export const demoWounds: WoundRecord[] = [
  { id: 'wound-001', patientId: 'p-002', label: 'Right plantar diabetic ulcer', location: 'Right plantar forefoot', woundType: 'Diabetic ulcer', onsetDate: '2026-07-29', status: 'active', lengthCm: 1.2, widthCm: 0.8, depthCm: 0.2, drainage: 'Scant serous', tissue: '80% granulation / 20% slough', lastMeasuredAt: '2026-08-16T10:00:00', treatmentOrder: 'Cleanse with NS; apply ordered dressing per wound-care order.' }
];
