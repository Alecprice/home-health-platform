import { Link, useParams } from 'react-router-dom';
import { demoPatients, patientName } from '../../data/demo';
import { PatientSafetyBanner } from '../../components/PatientSafetyBanner';
import { ClinicalContextPanel } from './ClinicalContextPanel';

export function ClinicalContextPage() {
  const { patientId } = useParams();
  const patient = demoPatients.find(row => row.id === patientId);
  if (!patient) return <div className="page"><h1>Patient not found</h1></div>;
  return <div className="page"><div className="page-heading"><div><p className="eyebrow">Clinical context</p><h1>{patientName(patient)}</h1><p>Medication, orders, goals, wounds, and recent-note context.</p></div><Link className="button ghost" to={`/patients/${patient.id}`}>Back to patient</Link></div><PatientSafetyBanner patient={patient} /><ClinicalContextPanel patient={patient} /></div>;
}
