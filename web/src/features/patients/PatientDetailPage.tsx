import { Link, useParams } from 'react-router-dom';
import { demoPatients, demoVisits, patientName } from '../../data/demo';
import { allergySummary, formatDate } from '../../utils/format';

export function PatientDetailPage() {
  const { patientId } = useParams();
  const patient = demoPatients.find(p => p.id === patientId);
  if (!patient) return <div className="page"><h1>Patient not found</h1></div>;
  const visits = demoVisits.filter(v => v.patientId === patient.id).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const allergy = allergySummary(patient);

  return (
    <div className="page">
      <div className="patient-header">
        <div className="patient-avatar large">{patient.firstName[0]}{patient.lastName[0]}</div>
        <div><p className="eyebrow">{patient.mrn}</p><h1>{patientName(patient)}</h1><p>DOB {formatDate(patient.dob)} · {patient.payer}</p></div>
      </div>

      <div className="button-row patient-context-actions"><Link className="button primary" to={`/patients/${patient.id}/clinical-context`}>Open clinical context</Link></div>

      <div className="detail-grid">
        <section className="panel"><h2>Clinical snapshot</h2><dl className="detail-list"><div><dt>Primary diagnosis</dt><dd>{patient.primaryDiagnosisCode} — {patient.primaryDiagnosis}</dd></div><div><dt>Physician</dt><dd>{patient.physician}</dd></div><div className={allergy.urgent ? 'allergy-alert-block' : ''}><dt>Allergies</dt><dd>{allergy.text}</dd></div></dl></section>
        <section className="panel"><h2>Contact</h2><dl className="detail-list"><div><dt>Phone</dt><dd>{patient.phone}</dd></div><div><dt>Address</dt><dd>{patient.address}</dd></div></dl></section>
      </div>

      <section className="panel"><div className="panel-heading"><div><h2>Scheduled visits</h2><p className="helper">Choose the exact visit before documenting. This avoids opening an arbitrary visit when a patient has more than one.</p></div><span className="badge">{visits.length}</span></div><div className="visit-list">{visits.map(visit => <article className="visit-card" key={visit.id}><div className="visit-time">{new Date(visit.scheduledAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div><div className="visit-details"><h3>{visit.type}</h3><p>{visit.discipline} · {visit.status}</p><span>{new Date(visit.scheduledAt).toLocaleDateString()}</span></div><div className="visit-actions"><Link className="button primary" to={`/visits/${visit.id}/chart`}>Open visit</Link></div></article>)}</div></section>

      <section className="info-callout"><strong>Clinical context is now modeled</strong><p>Medication, plan-of-care/orders, goals, wound context, and prior-note summaries are available as demo modules. They remain synthetic and are not a substitute for a live source-of-truth integration.</p></section>
    </div>
  );
}
