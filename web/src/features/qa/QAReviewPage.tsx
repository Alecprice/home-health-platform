import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { demoPatients, demoVisits, patientName } from '../../data/demo';
import { db } from '../../offline/db';
import type { ClinicalNoteDraft, QANoteStatus } from '../../types/domain';

export function QAReviewPage() {
  const [drafts, setDrafts] = useState<ClinicalNoteDraft[]>([]);
  const [error, setError] = useState('');

  const load = async () => {
    try { setDrafts(await db.drafts.toArray()); setError(''); }
    catch { setError('Device QA queue could not be read.'); }
  };
  useEffect(() => { void load(); }, []);

  const updateStatus = async (draft: ClinicalNoteDraft, qaStatus: QANoteStatus, qaReturnReason?: string) => {
    await db.drafts.put({ ...draft, qaStatus, qaReturnReason, updatedAt: new Date().toISOString(), syncStatus: 'pending' });
    await load();
  };

  const reviewable = drafts.filter(row => row.qaStatus !== 'not-submitted');
  return <div className="page"><div className="page-heading"><div><p className="eyebrow">Role-specific demo</p><h1>QA review queue</h1><p>Demonstrates return-for-correction and approval states. Real access will require authenticated QA/manager roles.</p></div></div>
    {error && <div className="validation-callout" role="alert">{error}</div>}
    <section className="panel"><div className="panel-heading"><h2>Submitted/returned drafts</h2><span className="badge">{reviewable.length}</span></div>
      {reviewable.length ? <div className="qa-list">{reviewable.map(draft => { const visit=demoVisits.find(v=>v.id===draft.visitId); const patient=demoPatients.find(p=>p.id===draft.patientId); return <article className="qa-row" key={draft.id}><div><strong>{patient ? patientName(patient) : draft.patientId}</strong><span>{visit ? `${visit.type} · ${visit.discipline}` : draft.visitId}</span><small>QA: {draft.qaStatus.replace('-', ' ')} · updated {new Date(draft.updatedAt).toLocaleString()}</small>{draft.qaStatus==='returned' && <p className="concern-text">Return reason: {draft.qaReturnReason}</p>}</div><div className="button-row"><Link className="button ghost" to={`/visits/${draft.visitId}/chart`}>Open note</Link><button className="button ghost" onClick={() => void updateStatus(draft,'returned','Clarify skilled intervention, patient response, and follow-up plan.')}>Return</button><button className="button primary" onClick={() => void updateStatus(draft,'approved')}>Approve</button></div></article>; })}</div> : <p className="empty-state">No device drafts have been submitted to QA yet.</p>}
    </section>
    <section className="info-callout"><strong>Important</strong><p>QA approval here is a workflow prototype, not a legal signature or production authorization mechanism.</p></section>
  </div>;
}
