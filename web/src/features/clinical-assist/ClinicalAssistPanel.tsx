import { useEffect, useMemo, useState } from 'react';
import { extractDeterministicSuggestions } from './extraction';
import { SpeechCapture } from './SpeechCapture';
import { scanDocument } from '../../native/clinicalAssist';
import type { Patient, SuggestedField } from '../../types/domain';
import { db, type NativeRecoveryItem } from '../../offline/db';
import { sourceIdentityWarnings } from './safety';

type AssistMode = 'voice' | 'patient' | 'document';
type Props = {
  patient?: Patient;
  onApplyToNarrative?: (text: string, mode: AssistMode) => void;
  onApplySuggestions?: (items: SuggestedField[]) => void;
  applyBlockedReason?: string;
  onPatientResponseAcknowledged?: () => void;
};
const MAX_TEXT = 100_000;

export function ClinicalAssistPanel({ patient, onApplyToNarrative, onApplySuggestions, applyBlockedReason, onPatientResponseAcknowledged }: Props) {
  const [mode, setMode] = useState<AssistMode>('voice');
  const [texts, setTexts] = useState<Record<AssistMode, string>>({ voice: '', patient: '', document: '' });
  const [suggestions, setSuggestions] = useState<SuggestedField[]>([]);
  const [identityWarnings, setIdentityWarnings] = useState<string[]>([]);
  const [scanStatus, setScanStatus] = useState('');
  const [scanBusy, setScanBusy] = useState(false);
  const [documentVerified, setDocumentVerified] = useState(false);
  const [recoveredScans, setRecoveredScans] = useState<NativeRecoveryItem[]>([]);
  const text = texts[mode];
  const canExtract = useMemo(() => text.trim().length > 0, [text]);
  const source = mode === 'document' ? 'document' : 'voice';
  const showDemoTools = import.meta.env.VITE_DEMO_TOOLS === 'true';
  const hasIdentityMismatch = identityWarnings.length > 0;
  const documentVerificationRequired = mode === 'document' && Boolean(patient) && !documentVerified;
  const applyLocked = Boolean(applyBlockedReason) || hasIdentityMismatch || documentVerificationRequired;

  useEffect(() => {
    let active = true;
    void db.nativeRecoveries.where('[kind+status]').equals(['document-scan', 'pending']).sortBy('createdAt')
      .then(rows => { if (active) setRecoveredScans(rows.reverse()); })
      .catch(() => { if (active) setScanStatus('Unable to read recovered Android scan results from device storage.'); });
    return () => { active = false; };
  }, []);

  const restoreScan = async (item: NativeRecoveryItem) => {
    const recovered = (item.ocrText ?? '').slice(0, MAX_TEXT);
    setMode('document');
    setTexts(current => ({ ...current, document: recovered }));
    setSuggestions([]);
    setIdentityWarnings([]);
    setDocumentVerified(false);
    setScanStatus(`Recovered a ${item.pageCount ?? 0}-page Android scan after the app was interrupted. Review the OCR text before applying anything.${item.ocrTruncated ? ' The recovered OCR text reached the safety limit and was truncated.' : ''}`);
    try {
      await db.nativeRecoveries.delete(item.id);
      setRecoveredScans(current => current.filter(row => row.id !== item.id));
    } catch {
      setScanStatus('Recovered scan loaded, but its recovery record could not be marked consumed.');
    }
  };

  const updateText = (next: string) => {
    const limited = next.slice(0, MAX_TEXT);
    setTexts(current => ({ ...current, [mode]: limited }));
    setSuggestions([]);
    setIdentityWarnings([]);
    if (mode === 'document') setDocumentVerified(false);
    if (next.length > MAX_TEXT) setScanStatus(`Text was limited to ${MAX_TEXT.toLocaleString()} characters for safe local analysis.`);
  };

  const changeMode = (next: AssistMode) => {
    setMode(next);
    setSuggestions([]);
    setIdentityWarnings([]);
    setScanStatus('');
    setDocumentVerified(false);
  };

  const analyze = () => {
    const next = extractDeterministicSuggestions(text, source);
    setSuggestions(next);
    setIdentityWarnings(sourceIdentityWarnings(patient, next));
  };

  const toggle = (id: string) => setSuggestions(current => current.map(s => s.id === id ? { ...s, selected: !s.selected } : s));

  const runScan = async () => {
    if (scanBusy) return;
    setScanBusy(true);
    setScanStatus('Opening Android document scanner…');
    setSuggestions([]);
    setIdentityWarnings([]);
    setDocumentVerified(false);
    try {
      const result = await scanDocument(10);
      const limited = result.ocrText.slice(0, MAX_TEXT);
      setTexts(current => ({ ...current, document: limited }));
      const failures = result.failedPageCount ?? 0;
      setScanStatus(`Scanned ${result.pageCount} page${result.pageCount === 1 ? '' : 's'} and extracted text on device.${failures ? ` OCR failed on ${failures} page${failures === 1 ? '' : 's'}; review the source.` : ''}${result.pdfUri ? ' A temporary scanner PDF reference was returned; durable source-document storage is not implemented yet.' : ''}${result.ocrTruncated ? ' OCR text reached the local 100,000-character safety limit and was truncated.' : ''}`);
    } catch (error) {
      setScanStatus(error instanceof Error ? error.message : 'Unable to scan document.');
    } finally { setScanBusy(false); }
  };

  const applySelected = () => {
    if (applyLocked) return;
    const selected = suggestions.filter(item => item.selected);
    if (!selected.length) return;
    onApplySuggestions?.(selected);
    setSuggestions(current => current.map(item => selected.some(chosen => chosen.id === item.id) ? { ...item, selected: false } : item));
  };

  return <section className="assist-card">
    <div className="section-heading-row"><div><p className="eyebrow">Clinical Assist</p><h2>Capture once. Verify every value before charting.</h2></div><span className="badge safe">Human review required</span></div>
    {applyBlockedReason && <div className="validation-callout" role="alert"><strong>Chart apply is locked</strong><span>{applyBlockedReason}</span></div>}
    <div className="segmented three-way">
      <button type="button" className={mode === 'voice' ? 'active' : ''} onClick={() => changeMode('voice')}>Clinician dictation</button>
      <button type="button" className={mode === 'patient' ? 'active' : ''} onClick={() => changeMode('patient')}>Patient response</button>
      <button type="button" className={mode === 'document' ? 'active' : ''} onClick={() => changeMode('document')}>Document / OCR</button>
    </div>

    <div className="assist-actions">
      {mode === 'voice' && <SpeechCapture key="voice" label="Dictate note" purpose="clinician-dictation" existingText={text} onTranscript={updateText} />}
      {mode === 'patient' && <><SpeechCapture key="patient" label="Transcribe patient response" purpose="patient-response" existingText={text} onTranscript={updateText} onPatientAcknowledged={onPatientResponseAcknowledged} /><small className="helper">Speech is transcribed for review; this workflow does not intentionally retain the raw patient audio recording.</small></>}
      {mode === 'document' && <><button className="assist-button" disabled={scanBusy} type="button" onClick={() => void runScan()}>{scanBusy ? 'Scanning…' : '📷 Scan document + OCR'}</button><button className="assist-button" disabled type="button" title="Durable imported-file OCR/storage is not implemented yet">📄 Import existing file — coming later</button></>}
    </div>

    {mode === 'document' && patient && <label className="confirmation-row document-source-confirmation"><input type="checkbox" checked={documentVerified} disabled={scanBusy || hasIdentityMismatch} onChange={event => setDocumentVerified(event.target.checked)} /><span><strong>I verified this document belongs to {patient.firstName} {patient.lastName}.</strong><small>Current chart: MRN {patient.mrn}. This check is required even when the document does not contain an MRN or DOB.</small></span></label>}
    {documentVerificationRequired && !hasIdentityMismatch && <div className="validation-callout"><strong>Verify the document source before applying it</strong><span>OCR can read a document correctly and still place the information in the wrong chart.</span></div>}

    {recoveredScans.length > 0 && <div className="recovery-callout"><strong>Recovered Android scan</strong><p>{recoveredScans.length} interrupted scan result{recoveredScans.length === 1 ? '' : 's'} available for review.</p><button className="button ghost" type="button" onClick={() => void restoreScan(recoveredScans[0])}>Restore latest scan</button></div>}
    {scanStatus && <p className="helper" role="status">{scanStatus}</p>}
    <textarea className="assist-textarea" value={text} onChange={e => updateText(e.target.value)} placeholder={mode === 'voice' ? 'Dictation transcript appears here…' : mode === 'patient' ? 'Patient-response transcript appears here…' : 'Scanned OCR text appears here…'} />
    <div className="button-row"><button type="button" className="button primary" disabled={!canExtract} onClick={analyze}>Find possible chart values</button>{onApplyToNarrative && <button type="button" className="button ghost" disabled={!canExtract || applyLocked} onClick={() => onApplyToNarrative(text, mode)}>{mode === 'patient' ? 'Add response to narrative' : 'Add text to narrative'}</button>}</div>

    {identityWarnings.length > 0 && <div className="validation-callout" role="alert"><strong>Possible wrong-patient source — nothing can be applied</strong><ul>{identityWarnings.map(item => <li key={item}>{item}</li>)}</ul><span>Verify the source document/patient before continuing. Scan a correct document or clear the text.</span></div>}

    {suggestions.length > 0 && <div className="suggestion-list"><div className="panel-heading"><h3>Possible chart values</h3><button className="button ghost" type="button" onClick={applySelected} disabled={applyLocked || !onApplySuggestions || !suggestions.some(item => item.selected)}>Apply selected</button></div>{suggestions.map(item => <label className="suggestion-row" key={item.id}><input type="checkbox" checked={item.selected} disabled={applyLocked} onChange={() => toggle(item.id)} /><span className="suggestion-main"><strong>{item.label}</strong>{showDemoTools && <small>{item.field}</small>}</span><span className="suggestion-value">{item.value}</span><span className="confidence">Text match {Math.round(item.confidence * 100)}%</span></label>)}<p className="helper"><strong>No values are preselected.</strong> Select only values you personally verified against the patient/source. Confidence reflects text matching, not clinical correctness.</p></div>}
  </section>;
}
