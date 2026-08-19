import { demoGoals, demoMedications, demoOrders, demoPlansOfCare, demoPriorNotes, demoWounds } from '../../data/demo';
import type { Discipline, Patient } from '../../types/domain';

interface Props {
  patient: Patient;
  discipline?: Discipline;
  compact?: boolean;
}

export function ClinicalContextPanel({ patient, discipline, compact = false }: Props) {
  const meds = demoMedications.filter(row => row.patientId === patient.id && row.status !== 'discontinued');
  const plan = demoPlansOfCare.find(row => row.patientId === patient.id && row.status === 'active');
  const orders = demoOrders.filter(row => row.patientId === patient.id && row.status === 'active' && (!discipline || !row.discipline || row.discipline === discipline));
  const goals = demoGoals.filter(row => row.patientId === patient.id && row.status === 'active' && (!discipline || row.discipline === discipline));
  const prior = demoPriorNotes.filter(row => row.patientId === patient.id).sort((a,b) => b.occurredAt.localeCompare(a.occurredAt));
  const wounds = demoWounds.filter(row => row.patientId === patient.id && row.status === 'active');
  const recentWeights = prior.flatMap(note => note.vitals?.weightLb !== undefined ? [{ at: note.occurredAt, value: note.vitals.weightLb }] : []).slice(0, 3);
  const recentSpO2 = prior.flatMap(note => note.vitals?.spo2 !== undefined ? [{ at: note.occurredAt, value: note.vitals.spo2 }] : []).slice(0, 3);

  return <div className={`clinical-context ${compact ? 'compact-context' : ''}`}>
    <section className="panel context-panel"><div className="panel-heading"><div><h2>Medication profile</h2><p className="helper">Current demo medication list. Reconciliation still requires clinician verification against the patient/source record.</p></div><span className="badge">{meds.length}</span></div>
      {meds.length ? <div className="context-list">{meds.map(med => <article className="context-row" key={med.id}><div><strong>{med.name} {med.strength}</strong><span>{[med.dose, med.route, med.frequency].filter(Boolean).join(' · ')}</span><small>{med.indication ?? 'Indication not entered'}{med.lastReconciledAt ? ` · reconciled ${new Date(med.lastReconciledAt).toLocaleDateString()}` : ''}</small></div>{med.highRisk && <span className="badge danger-badge">High risk</span>}</article>)}</div> : <p className="empty-state">No active medications loaded.</p>}
    </section>

    {plan && <section className="panel context-panel"><div className="panel-heading"><div><h2>Active plan of care</h2><p className="helper">{plan.episodeLabel}</p></div><span className="badge safe">Active</span></div><dl className="detail-list"><div><dt>Skilled need</dt><dd>{plan.skilledNeed}</dd></div><div><dt>Frequency</dt><dd>{plan.frequencySummary}</dd></div><div><dt>Precautions</dt><dd>{plan.precautions.join(' · ') || 'None listed'}</dd></div>{plan.homeboundReason && <div><dt>Homebound reason</dt><dd>{plan.homeboundReason}</dd></div>}<div><dt>Provider</dt><dd>{plan.certifyingProvider}</dd></div></dl></section>}

    <section className="panel context-panel"><div className="panel-heading"><div><h2>Active orders & goals</h2><p className="helper">Filtered to the current discipline when an order/goal is discipline-specific.</p></div></div>
      <div className="split-context"><div><h3>Orders</h3>{orders.length ? <div className="context-list">{orders.map(order => <article className="context-row" key={order.id}><div><strong>{order.category}</strong><span>{order.text}</span><small>{order.orderedBy} · {new Date(order.orderedAt).toLocaleDateString()}</small></div>{order.requiresFollowUp && <span className="badge warning-badge">Follow up</span>}</article>)}</div> : <p className="empty-state">No active matching orders.</p>}</div>
      <div><h3>Goals</h3>{goals.length ? <div className="context-list">{goals.map(goal => <article className="context-row" key={goal.id}><div><strong>{goal.description}</strong><span>{goal.progress ?? 'No progress note yet.'}</span><small>{goal.targetDate ? `Target ${new Date(goal.targetDate).toLocaleDateString()}` : 'No target date'}</small></div></article>)}</div> : <p className="empty-state">No active matching goals.</p>}</div></div>
    </section>

    {wounds.length > 0 && <section className="panel context-panel wound-context"><div className="panel-heading"><div><h2>Active wound tracking</h2><p className="helper">Measurement trend is patient context; wound treatment must follow the active order.</p></div><span className="badge warning-badge">{wounds.length} active</span></div>{wounds.map(wound => <article className="wound-card" key={wound.id}><strong>{wound.label}</strong><span>{wound.location} · {wound.woundType}</span><div className="wound-measures"><span>L {wound.lengthCm ?? '—'} cm</span><span>W {wound.widthCm ?? '—'} cm</span><span>D {wound.depthCm ?? '—'} cm</span></div><small>{wound.tissue} · {wound.drainage}</small>{wound.treatmentOrder && <p>{wound.treatmentOrder}</p>}</article>)}</section>}

    {(recentWeights.length > 1 || recentSpO2.length > 1) && <section className="panel context-panel"><div className="panel-heading"><div><h2>Recent trends</h2><p className="helper">Quick context only; verify measurement method and reassess today.</p></div></div><div className="trend-grid">{recentWeights.length > 1 && <div><span>Weight</span><strong>{recentWeights.map(row => `${row.value} lb`).join(' → ')}</strong><small>newest to older</small></div>}{recentSpO2.length > 1 && <div><span>SpO₂</span><strong>{recentSpO2.map(row => `${row.value}%`).join(' → ')}</strong><small>newest to older</small></div>}</div></section>}

    <section className="panel context-panel"><div className="panel-heading"><div><h2>Recent clinical context</h2><p className="helper">Use this to notice change from baseline; do not copy forward findings that were not reassessed today.</p></div><span className="badge">{prior.length}</span></div>{prior.length ? <div className="timeline-list">{prior.slice(0, compact ? 2 : 5).map(note => <article className="timeline-row" key={note.id}><div className="timeline-date">{new Date(note.occurredAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</div><div><strong>{note.discipline} · {note.author}</strong><p>{note.summary}</p>{note.concerns.length > 0 && <small className="concern-text">Watch: {note.concerns.join(' · ')}</small>}</div></article>)}</div> : <p className="empty-state">No prior note summaries loaded.</p>}</section>
  </div>;
}
