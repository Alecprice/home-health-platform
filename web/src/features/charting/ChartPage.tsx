import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { demoPatients, demoVisits, patientName } from '../../data/demo';
import { ClinicalAssistPanel } from '../clinical-assist/ClinicalAssistPanel';
import { db } from '../../offline/db';
import type { ClinicalNoteDraft, EvvCapture, SuggestedField } from '../../types/domain';
import { WorkflowRail } from '../../components/WorkflowRail';
import { PatientSafetyBanner } from '../../components/PatientSafetyBanner';
import { useWorkflow } from '../../workflow/WorkflowContext';
import type { WorkflowStepId } from '../../workflow/config';
import { EvvCaptureCard } from '../evv/EvvCaptureCard';
import { allergySummary, formatDate } from '../../utils/format';
import { applyReviewedSuggestions, createEmptyDraft, draftFingerprint, parseVitalInput, sanitizeStoredDraft, validateDraft, type VitalField } from './noteLogic';
import { buildVisitReadiness, signatureBlockers } from './readiness';
import { ClinicalContextPanel } from '../clinical-context/ClinicalContextPanel';
import { AssessmentEngine } from '../assessments/AssessmentEngine';

const MAX_NARRATIVE_CHARS = 50_000;
const MAX_PATIENT_RESPONSE_CHARS = 50_000;

function appendClinicalText(existing: string, incoming: string, max: number) {
  const right = incoming.trim();
  if (!right) return existing;
  const combined = `${existing}${existing ? '\n\n' : ''}${right}`;
  return combined.slice(0, max);
}

export function ChartPage() {
  const { visitId } = useParams();
  const location = useLocation();
  const { steps, hasStep } = useWorkflow();
  const visit = demoVisits.find(v => v.id === visitId);
  const patient = visit ? demoPatients.find(p => p.id === visit.patientId) : undefined;
  const draftId = useMemo(() => visit ? `draft-${visit.id}` : '', [visit]);
  const [draft, setDraft] = useState<ClinicalNoteDraft | null>(null);
  const [saved, setSaved] = useState('Loading local draft…');
  const [loaded, setLoaded] = useState(false);
  const [storageHealthy, setStorageHealthy] = useState(true);
  const [checkIn, setCheckIn] = useState<EvvCapture | null>(null);
  const [checkOut, setCheckOut] = useState<EvvCapture | null>(null);
  const lastPersistedFingerprint = useRef('');
  const latestDraftRef = useRef<ClinicalNoteDraft | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setCheckIn(null);
    setCheckOut(null);
    if (!visit || !patient || !draftId) {
      setDraft(null);
      setSaved('Visit unavailable');
      return () => { cancelled = true; };
    }

    const empty = createEmptyDraft(visit.id, patient.id);
    void Promise.all([
      db.drafts.get(draftId),
      db.evvCaptures.where('[visitId+kind]').equals([visit.id, 'check-in']).sortBy('capturedAt'),
      db.evvCaptures.where('[visitId+kind]').equals([visit.id, 'check-out']).sortBy('capturedAt')
    ]).then(([existing, ins, outs]) => {
      if (cancelled) return;
      const safeExisting = existing ? sanitizeStoredDraft(existing, visit.id, patient.id) : undefined;
      const next = safeExisting ?? empty;
      setDraft(next);
      setStorageHealthy(true);
      setCheckIn(ins.at(-1) ?? null);
      setCheckOut(outs.at(-1) ?? null);
      lastPersistedFingerprint.current = draftFingerprint(next);
      setSaved(safeExisting ? 'Loaded saved device draft' : existing ? 'Stored draft failed identity/integrity checks; started a clean draft.' : 'New local draft');
    }).catch(() => {
      if (cancelled) return;
      setDraft(empty);
      setStorageHealthy(false);
      lastPersistedFingerprint.current = draftFingerprint(empty);
      setSaved('Local storage could not be read; this draft is not yet protected from app closure.');
    }).finally(() => { if (!cancelled) setLoaded(true); });

    return () => { cancelled = true; };
  }, [draftId, patient?.id, visit?.id]);

  useEffect(() => { latestDraftRef.current = draft; }, [draft]);

  useEffect(() => {
    if (!loaded || location.hash !== '#clinical-assist') return;
    const timer = window.setTimeout(() => document.getElementById('clinical-assist')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    return () => window.clearTimeout(timer);
  }, [loaded, location.hash]);

  const queueLocalSave = (snapshot: ClinicalNoteDraft, updateUi: boolean) => {
    const fingerprint = draftFingerprint(snapshot);
    const queued = saveQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        await db.drafts.put(snapshot);
        if (latestDraftRef.current?.id === snapshot.id) setStorageHealthy(true);
        if (latestDraftRef.current?.id === snapshot.id) {
          lastPersistedFingerprint.current = fingerprint;
          if (updateUi) setSaved(`Saved on device ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`);
        }
      });
    saveQueueRef.current = queued;
    return queued;
  };

  useEffect(() => {
    const flushLatest = () => {
      const current = latestDraftRef.current;
      if (!current || draftFingerprint(current) === lastPersistedFingerprint.current) return;
      const snapshot: ClinicalNoteDraft = { ...current, updatedAt: new Date().toISOString(), syncStatus: 'pending' };
      void queueLocalSave(snapshot, false).catch(() => undefined);
    };
    const onVisibilityChange = () => { if (document.visibilityState === 'hidden') flushLatest(); };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', flushLatest);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', flushLatest);
      flushLatest();
    };
  }, [draftId]);

  useEffect(() => {
    if (!loaded || !draft || draft.id !== draftId || draft.visitId !== visit?.id || draft.patientId !== patient?.id) return;
    const fingerprint = draftFingerprint(draft);
    if (fingerprint === lastPersistedFingerprint.current) return;
    const timer = window.setTimeout(() => {
      const snapshot: ClinicalNoteDraft = { ...draft, updatedAt: new Date().toISOString(), syncStatus: 'pending' };
      void queueLocalSave(snapshot, false)
        .then(() => {
          if (latestDraftRef.current?.id === snapshot.id) setSaved(`Auto-saved on device ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`);
        })
        .catch(() => {
          if (latestDraftRef.current?.id === snapshot.id) setSaved('Auto-save failed. Use Save draft and keep the app open until storage is available.');
        });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [draft, loaded, draftId, visit?.id, patient?.id]);

  const onCheckIn = useCallback((capture: EvvCapture | null) => setCheckIn(capture), []);
  const onCheckOut = useCallback((capture: EvvCapture | null) => setCheckOut(capture), []);

  if (!visit || !patient) return <div className="page"><h1>Visit not found</h1><Link to="/">Return to today</Link></div>;
  const draftMatchesRoute = draft?.id === draftId && draft.visitId === visit.id && draft.patientId === patient.id;
  if (!draft || !draftMatchesRoute) return <div className="page"><h1>Loading visit…</h1><p>{saved}</p></div>;

  const validationErrors = validateDraft(draft);
  const readiness = buildVisitReadiness(draft, {
    requireCheckIn: hasStep('evv-check-in'), requireCheckOut: hasStep('evv-check-out'), checkIn, checkOut
  });
  readiness.unshift({
    id: 'storage', label: 'Device draft storage available', complete: storageHealthy,
    detail: storageHealthy ? 'Draft storage is available.' : 'Device storage failed. Do not finalize this visit until the draft can be saved safely.'
  });
  const blockers = signatureBlockers(readiness);
  const allergy = allergySummary(patient);

  const updateVital = (field: VitalField, value: string) => {
    const parsed = parseVitalInput(value);
    setDraft(current => current ? { ...current, vitals: { ...current.vitals, [field]: parsed } } : current);
  };

  const applyAssistSuggestions = (items: SuggestedField[]) => {
    const result = applyReviewedSuggestions(draft, items);
    setDraft(result.draft);
    const parts = [`Applied ${result.applied}`];
    if (result.deferred) parts.push(`${result.deferred} deferred to another form`);
    if (result.rejected) parts.push(`${result.rejected} rejected as out of range`);
    setSaved(parts.join(' · '));
  };

  const saveLocal = async () => {
    const next: ClinicalNoteDraft = { ...draft, updatedAt: new Date().toISOString(), syncStatus: 'pending' };
    try {
      setDraft(next);
      latestDraftRef.current = next;
      await queueLocalSave(next, true);
    } catch {
      setStorageHealthy(false);
      setSaved('Save failed. Local device storage may be unavailable or full.');
    }
  };

  const reviewSign = () => {
    if (blockers.length) {
      setSaved(`Not ready to sign: ${blockers[0]}`);
      document.getElementById('visit-readiness')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setSaved('Visit is ready for final review. Actual authenticated signing/server finalization is not implemented yet.');
  };

  const renderWorkflowStep = (stepId: WorkflowStepId) => {
    switch (stepId) {
      case 'patient-review':
        return <section className="panel compact-panel"><div className="panel-heading"><div><h2>Confirm the patient</h2><p className="helper">Verify at least two identifiers before documenting. Do not rely on room/location alone.</p></div><span className="badge safe">Required</span></div><div className="review-strip"><div><span>MRN</span><strong>{patient.mrn}</strong></div><div><span>DOB</span><strong>{formatDate(patient.dob)}</strong></div><div><span>Diagnosis</span><strong>{patient.primaryDiagnosisCode}</strong></div><div className={allergy.urgent ? 'allergy-alert' : ''}><span>Allergies</span><strong>{allergy.text}</strong></div></div><label className="confirmation-row"><input type="checkbox" checked={draft.patientIdentityConfirmed} onChange={event => setDraft(current => current ? { ...current, patientIdentityConfirmed: event.target.checked } : current)} /><span><strong>I confirmed this patient and this scheduled visit.</strong><small>Required before final review/sign.</small></span></label></section>;
      case 'evv-check-in':
        return <EvvCaptureCard visitId={visit.id} kind="check-in" blockedReason={checkOut ? 'This visit already has an EVV check-out. Do not create a later check-in; review the visit instead.' : undefined} onLatestChange={onCheckIn} />;
      case 'clinical-context':
        return <>
          <ClinicalContextPanel patient={patient} discipline={visit.discipline} compact />
          <section className="panel compact-panel"><div className="panel-heading"><div><h2>Confirm clinical context review</h2><p className="helper">Mark each item only after reviewing the current source/context. These checks do not mean the data is automatically reconciled.</p></div><span className="badge safe">Required</span></div><div className="review-confirmation-grid">
            <label className="confirmation-row"><input type="checkbox" checked={draft.medicationsReviewed} onChange={e => setDraft(current => current ? { ...current, medicationsReviewed: e.target.checked } : current)} /><span><strong>Medication list reviewed</strong><small>Compare against patient/caregiver/source records and address discrepancies.</small></span></label>
            <label className="confirmation-row"><input type="checkbox" checked={draft.planOfCareReviewed} onChange={e => setDraft(current => current ? { ...current, planOfCareReviewed: e.target.checked } : current)} /><span><strong>Plan of care reviewed</strong><small>Confirm skilled need, frequency, precautions, and applicable restrictions.</small></span></label>
            <label className="confirmation-row"><input type="checkbox" checked={draft.ordersReviewed} onChange={e => setDraft(current => current ? { ...current, ordersReviewed: e.target.checked } : current)} /><span><strong>Active orders reviewed</strong><small>Review discipline-specific orders, parameters, and follow-up needs.</small></span></label>
            <label className="confirmation-row"><input type="checkbox" checked={draft.priorContextReviewed} onChange={e => setDraft(current => current ? { ...current, priorContextReviewed: e.target.checked } : current)} /><span><strong>Recent notes/trends reviewed</strong><small>Use prior context to identify change; do not copy forward unassessed findings.</small></span></label>
          </div></section>
        </>;
      case 'assessment':
        return <>
          <section className="panel"><div className="panel-heading"><h2>Assessment</h2><span className="badge">Vitals</span></div><div className="form-grid">
            <label>Systolic BP <span className="unit-hint">mmHg</span><input type="number" inputMode="numeric" min="40" max="300" value={draft.vitals.systolic ?? ''} onChange={e => updateVital('systolic', e.target.value)} placeholder="120" /></label>
            <label>Diastolic BP <span className="unit-hint">mmHg</span><input type="number" inputMode="numeric" min="20" max="200" value={draft.vitals.diastolic ?? ''} onChange={e => updateVital('diastolic', e.target.value)} placeholder="80" /></label>
            <label>Pulse <span className="unit-hint">bpm</span><input type="number" inputMode="numeric" min="20" max="250" value={draft.vitals.pulse ?? ''} onChange={e => updateVital('pulse', e.target.value)} placeholder="72" /></label>
            <label>Temperature <span className="unit-hint">°F</span><input type="number" step="0.1" inputMode="decimal" min="80" max="115" value={draft.vitals.temperatureF ?? ''} onChange={e => updateVital('temperatureF', e.target.value)} placeholder="98.6" /></label>
            <label>SpO₂ <span className="unit-hint">%</span><input type="number" inputMode="numeric" min="40" max="100" value={draft.vitals.spo2 ?? ''} onChange={e => updateVital('spo2', e.target.value)} placeholder="97" /></label>
            <label>Pain <span className="unit-hint">0–10</span><input type="number" inputMode="numeric" min="0" max="10" value={draft.vitals.pain ?? ''} onChange={e => updateVital('pain', e.target.value)} placeholder="0" /></label>
            <label>Respirations <span className="unit-hint">/min</span><input type="number" inputMode="numeric" min="4" max="80" value={draft.vitals.respirations ?? ''} onChange={e => updateVital('respirations', e.target.value)} placeholder="16" /></label>
            <label>Weight <span className="unit-hint">lb</span><input type="number" step="0.1" inputMode="decimal" min="30" max="1000" value={draft.vitals.weightLb ?? ''} onChange={e => updateVital('weightLb', e.target.value)} placeholder="170" /></label>
          </div>{validationErrors.length > 0 && <div className="validation-callout" role="alert"><strong>Check these values before signing</strong><ul>{validationErrors.map(error => <li key={error}>{error}</li>)}</ul></div>}</section>
          <section className="panel"><div className="panel-heading"><div><h2>{visit.discipline} structured assessment</h2><p className="helper">Reusable discipline-aware fields. This is not yet the full OASIS-E2 instrument; only applicable assessed findings belong here.</p></div><span className="badge">{draft.assessmentResponses.length} answered</span></div><AssessmentEngine discipline={visit.discipline} responses={draft.assessmentResponses} onChange={assessmentResponses => setDraft(current => current ? { ...current, assessmentResponses } : current)} /></section>
          <section className="panel"><div className="panel-heading"><div><h2>Visit narrative</h2><p className="helper">Document clinically meaningful findings and changes. Avoid copy-forward language for findings not reassessed today.</p></div><span className="badge safe">Auto-saved locally</span></div><textarea className="narrative" value={draft.narrative} maxLength={MAX_NARRATIVE_CHARS} onChange={e => setDraft(current => current ? { ...current, narrative: e.target.value.slice(0, MAX_NARRATIVE_CHARS) } : current)} placeholder="Today's assessment/findings and clinically meaningful changes…" /><small className="character-count">{draft.narrative.length.toLocaleString()} / {MAX_NARRATIVE_CHARS.toLocaleString()}</small></section>
          <section className="panel"><div className="panel-heading"><div><h2>Skilled care & follow-up</h2><p className="helper">Separate what you did, what you taught, how the patient responded, and what needs to happen next.</p></div></div><div className="clinical-documentation-grid">
            <label><span>Skilled interventions</span><textarea value={draft.interventions} maxLength={20_000} onChange={e => setDraft(current => current ? { ...current, interventions: e.target.value.slice(0,20_000) } : current)} placeholder="Skilled assessment, treatment, coordination, wound care, therapy intervention…" /></label>
            <label><span>Education / training</span><textarea value={draft.education} maxLength={20_000} onChange={e => setDraft(current => current ? { ...current, education: e.target.value.slice(0,20_000) } : current)} placeholder="Teaching provided, learner, understanding/teach-back, reinforcement needed…" /></label>
            <label><span>Response to care</span><textarea value={draft.responseToCare} maxLength={20_000} onChange={e => setDraft(current => current ? { ...current, responseToCare: e.target.value.slice(0,20_000) } : current)} placeholder="Tolerance, response, progress, unresolved concern…" /></label>
            <label><span>Next visit / follow-up plan</span><textarea value={draft.nextVisitPlan} maxLength={20_000} onChange={e => setDraft(current => current ? { ...current, nextVisitPlan: e.target.value.slice(0,20_000) } : current)} placeholder="Next skilled focus, provider follow-up, pending order/result, escalation…" /></label>
          </div></section>
        </>;
      case 'clinical-assist':
        return <section id="clinical-assist" className="anchor-section"><ClinicalAssistPanel patient={patient} applyBlockedReason={!draft.patientIdentityConfirmed ? 'Confirm the patient identity above before applying dictated, transcribed, or scanned content to this chart.' : undefined} onApplyToNarrative={(text, mode) => setDraft(current => current ? {
          ...current,
          narrative: appendClinicalText(current.narrative, text, MAX_NARRATIVE_CHARS),
          patientResponse: mode === 'patient' ? appendClinicalText(current.patientResponse, text, MAX_PATIENT_RESPONSE_CHARS) : current.patientResponse
        } : current)} onPatientResponseAcknowledged={() => setDraft(current => current ? { ...current, patientResponseTranscriptionAcknowledgedAt: current.patientResponseTranscriptionAcknowledgedAt ?? new Date().toISOString() } : current)} onApplySuggestions={applyAssistSuggestions} />{draft.patientResponse.trim() && <section className="panel"><div className="panel-heading"><div><h2>Patient-response transcript</h2><p className="helper">Working transcript only. Review and correct speech-recognition errors before relying on it.</p></div><span className="badge">Editable</span></div><textarea className="narrative" value={draft.patientResponse} maxLength={MAX_PATIENT_RESPONSE_CHARS} onChange={e => setDraft(current => current ? { ...current, patientResponse: e.target.value.slice(0, MAX_PATIENT_RESPONSE_CHARS) } : current)} />{draft.patientResponseTranscriptionAcknowledgedAt && <small className="helper">Speech-to-text awareness acknowledged for this visit.</small>}</section>}</section>;
      case 'evv-check-out':
        return <EvvCaptureCard visitId={visit.id} kind="check-out" blockedReason={hasStep('evv-check-in') && !checkIn ? 'Complete EVV check-in before check-out so the visit sequence cannot be reversed accidentally.' : undefined} onLatestChange={onCheckOut} />;
      case 'review-sign':
        return <><section className="panel" id="visit-readiness"><div className="panel-heading"><div><h2>Final review readiness</h2><p className="helper">This checklist prevents an empty or incomplete visit from appearing ready to sign.</p></div><span className={`badge ${blockers.length ? '' : 'safe'}`}>{blockers.length ? `${blockers.length} item${blockers.length === 1 ? '' : 's'} left` : 'Ready for review'}</span></div><div className="readiness-list">{readiness.map(item => <div className={`readiness-row ${item.complete ? 'complete' : ''}`} key={item.id}><span className="readiness-icon" aria-hidden="true">{item.complete ? '✓' : '!'}</span><div><strong>{item.label}</strong><span>{item.detail}</span></div></div>)}</div></section><section className="panel qa-panel"><div className="panel-heading"><div><h2>QA / correction status</h2><p className="helper">A signed-note workflow will later require authenticated signing. QA return reasons remain separate from the finalized clinical record until corrected.</p></div><span className="badge">{draft.qaStatus.replace('-', ' ')}</span></div>{draft.qaStatus === 'returned' && <div className="validation-callout"><strong>Returned for correction</strong><p>{draft.qaReturnReason || 'No return reason entered.'}</p></div>}<div className="button-row"><button className="button ghost" type="button" onClick={() => setDraft(current => current ? { ...current, qaStatus: 'submitted' } : current)}>Mark submitted to QA</button>{import.meta.env.VITE_DEMO_TOOLS === 'true' && <button className="button ghost" type="button" onClick={() => setDraft(current => current ? { ...current, qaStatus: 'returned', qaReturnReason: 'Demo return: clarify intervention and patient response before finalization.' } : current)}>Demo: return for correction</button>}</div></section></>;
      case 'field-work':
        return <section className="panel compact-panel field-work-promo"><div><p className="eyebrow">Optional</p><h2>Mileage & expenses</h2><p>Log business travel or field expenses separately from the clinical record.</p></div><Link className="button ghost" to="/field-work">Open field-work log</Link></section>;
      default: {
        const exhaustive: never = stepId;
        return exhaustive;
      }
    }
  };

  return (
    <div className="page chart-page">
      <div className="chart-toolbar"><div><Link to={`/patients/${patient.id}`}>← Patient info</Link><h1>{patientName(patient)}</h1><p>{visit.type} · {visit.discipline}</p></div><div className="chart-save"><span role="status">{saved}</span><button className="button primary" onClick={() => void saveLocal()}>Save on device</button></div></div>
      <PatientSafetyBanner patient={patient} visit={visit} />
      <WorkflowRail />
      {steps.map(stepId => <div className="workflow-section" data-workflow-step={stepId} key={stepId}>{renderWorkflowStep(stepId)}</div>)}
      <div className="sticky-actions"><span>{blockers.length ? `${blockers.length} completion item${blockers.length === 1 ? '' : 's'} remaining` : 'Visit ready for final review'} · draft saved separately from workflow configuration</span><div><button className="button ghost" onClick={() => void saveLocal()}>Save draft</button>{hasStep('review-sign') && <button className="button primary" disabled={blockers.length > 0} onClick={reviewSign}>Review & sign</button>}</div></div>
    </div>
  );
}
