import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { demoPatients, patientName } from '../../data/demo';
import { allergySummary, formatDate } from '../../utils/format';

export function PatientsPage() {
  const [query, setQuery] = useState('');
  const patients = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return demoPatients;
    return demoPatients.filter(patient => `${patientName(patient)} ${patient.mrn} ${patient.primaryDiagnosis}`.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="page">
      <div className="page-heading"><div><p className="eyebrow">Patient roster</p><h1>Patients</h1><p>{demoPatients.length} synthetic patients loaded for the demo.</p></div></div>
      <label className="patient-search"><span>Find a patient</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name, MRN, or diagnosis" autoComplete="off" /></label>
      <section className="patient-grid" aria-live="polite">
        {patients.map(patient => {
          const allergy = allergySummary(patient);
          return <Link className="patient-card" key={patient.id} to={`/patients/${patient.id}`}>
            <div className="patient-avatar">{patient.firstName[0]}{patient.lastName[0]}</div>
            <div><h2>{patientName(patient)}</h2><p>{patient.mrn} · DOB {formatDate(patient.dob)}</p><span>{patient.primaryDiagnosisCode} · {patient.primaryDiagnosis}</span>{allergy.urgent && <small className="inline-allergy">Allergies: {allergy.text}</small>}</div>
            <strong aria-hidden="true">›</strong>
          </Link>;
        })}
        {!patients.length && <section className="panel"><strong>No matching patients</strong><p className="helper">Check the spelling or MRN and try again.</p></section>}
      </section>
    </div>
  );
}
