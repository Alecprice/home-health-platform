import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { demoPatients, demoVisits, patientName } from '../../data/demo';
import { useWorkflow } from '../../workflow/WorkflowContext';
import { db } from '../../offline/db';
import type { EvvCapture } from '../../types/domain';
import { apiGet } from '../../services/api';

type LocalVisitProgress = 'scheduled' | 'in-progress' | 'checked-out';
type DemoDatabaseStatus = { ok: boolean; syntheticOnly?: boolean; tenantIsolation?: string; patients?: number; visits?: number; medications?: number };
type RemoteState = 'checking' | 'connected' | 'unavailable';

export function DashboardPage() {
  const { hasStep } = useWorkflow();
  const [pendingSync, setPendingSync] = useState<number | null>(null);
  const [storageWarning, setStorageWarning] = useState('');
  const [progress, setProgress] = useState<Record<string, LocalVisitProgress>>({});
  const [remoteState, setRemoteState] = useState<RemoteState>('checking');
  const [remoteStatus, setRemoteStatus] = useState<DemoDatabaseStatus | null>(null);
  const showDemoTools = import.meta.env.VITE_DEMO_TOOLS === 'true';

  useEffect(() => {
    let cancelled = false;
    void apiGet<DemoDatabaseStatus>('/demo/database-status', 8000)
      .then(status => { if (!cancelled) { setRemoteStatus(status); setRemoteState(status.ok ? 'connected' : 'unavailable'); } })
      .catch(() => { if (!cancelled) setRemoteState('unavailable'); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      db.drafts.where('syncStatus').equals('pending').count(),
      db.evvCaptures.where('syncStatus').equals('pending').count(),
      db.evvCaptures.toArray()
    ]).then(([drafts, evv, captures]) => {
      if (cancelled) return;
      setPendingSync(drafts + evv);
      const next: Record<string, LocalVisitProgress> = {};
      for (const visit of demoVisits) {
        const rows = (captures as EvvCapture[]).filter(row => row.visitId === visit.id);
        next[visit.id] = rows.some(row => row.kind === 'check-out') ? 'checked-out' : rows.some(row => row.kind === 'check-in') ? 'in-progress' : 'scheduled';
      }
      setProgress(next);
    }).catch(() => { if (!cancelled) { setPendingSync(null); setStorageWarning('Device queue/progress could not be read.'); } });
    return () => { cancelled = true; };
  }, []);

  const demoDate = useMemo(() => {
    const first = demoVisits[0]?.scheduledAt;
    return first ? new Date(first).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }) : 'Demo day';
  }, []);
  const checkedOutCount = demoVisits.filter(visit => progress[visit.id] === 'checked-out').length;

  return <div className="page">
    <div className="page-heading"><div><p className="eyebrow">{demoDate}</p><h1>Today's visits</h1><p>{demoVisits.length} scheduled visits · Demo clinician</p></div>{showDemoTools && <div className="button-row"><Link to="/workflow-lab" className="button ghost">Workflow test controls</Link></div>}</div>
    {storageWarning && <p className="info-callout" role="alert">{storageWarning}</p>}
    <section className="panel deployment-status" aria-label="Demo infrastructure status"><div className="panel-heading"><div><p className="eyebrow">Synthetic hosted demo</p><h2>Demo infrastructure</h2></div><span className={`badge ${remoteState === 'connected' ? 'success' : ''}`}>{remoteState === 'checking' ? 'Checking…' : remoteState === 'connected' ? 'API + database connected' : 'Local demo mode'}</span></div><p>{remoteState === 'connected' ? `Live synthetic tenant: ${remoteStatus?.patients ?? 0} patient(s), ${remoteStatus?.visits ?? 0} visit(s), ${remoteStatus?.medications ?? 0} medication(s). Database tenant isolation is active.` : 'The tablet/browser demo still works with local synthetic records if the hosted API is unavailable.'}</p><small>No real PHI is permitted in this environment.</small></section>
    <div className="metric-grid"><article><span>Scheduled</span><strong>{demoVisits.length}</strong><small>demo day</small></article><article><span>Checked out</span><strong>{checkedOutCount}</strong><small>not the same as signed</small></article><article><span>Needs sync</span><strong>{pendingSync ?? '—'}</strong><small>unsynced drafts + EVV</small></article></div>
    <section className="panel"><div className="panel-heading"><h2>Visit route</h2><span className="badge">Synthetic demo data</span></div><div className="visit-list">{demoVisits.map(visit => { const patient = demoPatients.find(p => p.id === visit.patientId); if (!patient) return null; const time = new Date(visit.scheduledAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); const local = progress[visit.id] ?? 'scheduled'; const action = local === 'scheduled' ? 'Start visit' : local === 'in-progress' ? 'Continue visit' : 'Review visit'; return <article className="visit-card" key={visit.id}><div className="visit-time">{time}</div><div className="visit-details"><h3>{patientName(patient)}</h3><p>{visit.type} · {visit.discipline}</p><span>{patient.address}</span><small className={`visit-progress ${local}`}>{local === 'checked-out' ? 'Checked out · note may still need review/sign' : local === 'in-progress' ? 'Visit in progress' : 'Scheduled'}</small></div><div className="visit-actions"><Link className="button ghost" to={`/patients/${patient.id}`}>Patient info</Link><Link className="button primary" to={`/visits/${visit.id}/chart`}>{action}</Link></div></article>; })}</div></section>
    {hasStep('field-work') && <section className="panel field-work-promo"><div><p className="eyebrow">Optional operations</p><h2>Mileage & expenses</h2><p>Track business miles, gas, parking, tolls, supplies, and other approved field costs without mixing them into the clinical note.</p></div><Link className="button ghost" to="/field-work">Open field-work log</Link></section>}
  </div>;
}
