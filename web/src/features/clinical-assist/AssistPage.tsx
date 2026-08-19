import { Link } from 'react-router-dom';
import { demoPatients, demoVisits, patientName } from '../../data/demo';

export function AssistPage() {
  return <div className="page">
    <div className="page-heading"><div><p className="eyebrow">Demo tool</p><h1>Clinical Assist test entry</h1><p>Choose a visit first. Chart-affecting dictation, patient-response transcription, OCR, and autofill must always have an explicit patient/visit context.</p></div></div>
    <section className="info-callout" role="note"><strong>Patient-safety guardrail</strong><p>This page intentionally does not allow free-floating clinical extraction. Open a visit to use Clinical Assist.</p></section>
    <section className="panel"><div className="panel-heading"><h2>Choose a demo visit</h2><span className="badge safe">Context required</span></div><div className="visit-list">{demoVisits.map(visit => { const patient = demoPatients.find(row => row.id === visit.patientId); if (!patient) return null; return <article className="visit-card" key={visit.id}><div className="visit-time">{new Date(visit.scheduledAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div><div className="visit-details"><h3>{patientName(patient)}</h3><p>{visit.type} · {visit.discipline}</p><span>{patient.mrn}</span></div><div className="visit-actions"><Link className="button primary" to={`/visits/${visit.id}/chart#clinical-assist`}>Open visit</Link></div></article>; })}</div></section>
  </div>;
}
