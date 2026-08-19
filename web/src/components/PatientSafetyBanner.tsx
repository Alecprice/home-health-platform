import type { Patient, Visit } from '../types/domain';
import { allergySummary, formatDate, formatDateTime } from '../utils/format';
import { patientName } from '../data/demo';

export function PatientSafetyBanner({ patient, visit }: { patient: Patient; visit?: Visit }) {
  const allergy = allergySummary(patient);
  return (
    <section className="patient-safety-banner" aria-label="Current patient safety banner">
      <div><span>Patient</span><strong>{patientName(patient)}</strong></div>
      <div><span>DOB</span><strong>{formatDate(patient.dob)}</strong></div>
      <div><span>MRN</span><strong>{patient.mrn}</strong></div>
      <div><span>Visit</span>{visit ? <><strong>{visit.type} · {visit.discipline}</strong><small>{formatDateTime(visit.scheduledAt)}</small></> : <strong>No visit selected</strong>}</div>
      <div className={allergy.urgent ? 'allergy-alert' : ''}><span>Allergies</span><strong>{allergy.text}</strong></div>
    </section>
  );
}
